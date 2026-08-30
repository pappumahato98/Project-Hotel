/**
 * Security Monitor Hook
 * 
 * Monitors TLS connection status, security headers, authentication events,
 * and session integrity. Provides real-time data to the Security Dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from "@/lib/queryKeys";
import {
  getTLSStatus,
  auditSecurityHeaders,
  calculateSecurityScore,
  getSecurityGrade,
  type TLSStatus,
  type HeaderAuditResult,
} from '@/utils/securityHeaders';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SecurityEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AuthSecurityMetrics {
  failedLoginAttempts: number;
  activeSessions: number;
  mfaAdoptionRate: number;
  lastFailedLogin: string | null;
}

export interface SecurityMonitorState {
  // TLS
  tlsStatus: TLSStatus;
  // Headers
  headerAudit: HeaderAuditResult[];
  headersLoading: boolean;
  // Score
  securityScore: number;
  securityGrade: { grade: string; color: string; label: string };
  // Auth metrics
  authMetrics: AuthSecurityMetrics;
  authMetricsLoading: boolean;
  // Security events
  securityEvents: SecurityEvent[];
  eventsLoading: boolean;
  threatLevel: 'Low' | 'Elevated' | 'High' | 'Critical';
  // Session
  sessionValid: boolean;
  userAgent: string;
  // Actions
  refreshAudit: () => void;
}

// ─── Helper: Classify Security Event ────────────────────────────────────────

function classifyEventSeverity(action: string): 'info' | 'warning' | 'critical' {
  const criticalPatterns = /fail|unauthorized|breach|block|deny/i;
  const warningPatterns = /change|delete|export|role|permission/i;

  if (criticalPatterns.test(action)) return 'critical';
  if (warningPatterns.test(action)) return 'warning';
  return 'info';
}

function calculateThreatLevel(events: SecurityEvent[]): 'Low' | 'Elevated' | 'High' | 'Critical' {
  const criticalCount = events.filter(e => e.severity === 'critical').length;
  const warningCount = events.filter(e => e.severity === 'warning').length;

  if (criticalCount >= 5) return 'Critical';
  if (criticalCount >= 2 || warningCount >= 5) return 'High';
  if (criticalCount >= 1 || warningCount >= 2) return 'Elevated';
  return 'Low';
}

// ─── Main Hook ──────────────────────────────────────────────────────────────

export function useSecurityMonitor(): SecurityMonitorState {
  const [tlsStatus, setTlsStatus] = useState<TLSStatus>(getTLSStatus());
  const [headerAudit, setHeaderAudit] = useState<HeaderAuditResult[]>([]);
  const [headersLoading, setHeadersLoading] = useState(true);
  const [sessionUserAgent] = useState(navigator.userAgent);

  // ── TLS Status (updates on visibility change) ──
  useEffect(() => {
    const updateTLS = () => setTlsStatus(getTLSStatus());
    document.addEventListener('visibilitychange', updateTLS);
    return () => document.removeEventListener('visibilitychange', updateTLS);
  }, []);

  // ── Security Headers Audit ──
  const runHeaderAudit = useCallback(async () => {
    setHeadersLoading(true);
    try {
      const results = await auditSecurityHeaders();
      setHeaderAudit(results);
    } finally {
      setHeadersLoading(false);
    }
  }, []);

  useEffect(() => {
    runHeaderAudit();
  }, [runHeaderAudit]);

  // ── Security Events (from audit_log) ──
  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.security.monitorEvents,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .or(
          'action.ilike.%security%,action.ilike.%fail%,action.ilike.%unauthorized%,action.ilike.%login%,action.ilike.%role%,action.ilike.%password%'
        )
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000, // refresh every 30 seconds
  });

  const securityEvents: SecurityEvent[] = rawEvents.map((log: any) => ({
    id: log.id,
    action: log.action,
    entity_type: log.entity_type || 'system',
    entity_id: log.entity_id,
    ip_address: log.ip_address,
    created_at: log.created_at,
    severity: classifyEventSeverity(log.action),
  }));

  // ── Auth Security Metrics ──
  const { data: authMetrics, isLoading: authMetricsLoading } = useQuery({
    queryKey: queryKeys.security.authMetrics,
    queryFn: async () => {
      // Count failed login attempts in last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count: failedCount } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .ilike('action', '%fail%')
        .gte('created_at', twentyFourHoursAgo);

      const { data: lastFailed } = await supabase
        .from('audit_log')
        .select('created_at')
        .ilike('action', '%fail%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        failedLoginAttempts: failedCount || 0,
        activeSessions: 1, // Current session
        mfaAdoptionRate: 100, // Placeholder until MFA is fully implemented
        lastFailedLogin: lastFailed?.created_at || null,
      } as AuthSecurityMetrics;
    },
    refetchInterval: 60_000,
  });

  // ── Calculate Score ──
  const securityScore = calculateSecurityScore(headerAudit, tlsStatus);
  const securityGrade = getSecurityGrade(securityScore);
  const threatLevel = calculateThreatLevel(securityEvents);

  // ── Session Integrity Check ──
  const sessionValid = navigator.userAgent === sessionUserAgent;

  return {
    tlsStatus,
    headerAudit,
    headersLoading,
    securityScore,
    securityGrade,
    authMetrics: authMetrics || {
      failedLoginAttempts: 0,
      activeSessions: 1,
      mfaAdoptionRate: 100,
      lastFailedLogin: null,
    },
    authMetricsLoading,
    securityEvents,
    eventsLoading,
    threatLevel,
    sessionValid,
    userAgent: sessionUserAgent,
    refreshAudit: runHeaderAudit,
  };
}
