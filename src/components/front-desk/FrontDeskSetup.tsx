import { useState, useEffect } from "react";
import { 
  Building, Bed, Layers, Tags, Percent, CreditCard, Users2, ShieldAlert,
  Network, FileText, Plus, Edit, Trash2, Save, RefreshCw, Check, CheckSquare, 
  Square, UserPlus, Shield, Key, Phone, Activity, Eye, Play, Mail, MessageSquare,
  Sparkles, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, Laptop, HelpCircle,
  Loader2, Crown, TrendingUp, Building2, Globe, Calendar, Palette, Clock,
  Lock, Fingerprint, Ban, DollarSign, Zap, BookOpen
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { useFrontDeskSetup } from "@/hooks/useFrontDeskSetup";
import { useRooms, useRoomsMutations } from "@/hooks/useRooms";
import { SetupLoyalty } from "./SetupLoyalty";
import { SetupRevenue } from "./SetupRevenue";
import { SetupMultiProperty } from "./SetupMultiProperty";

export function FrontDeskSetup() {
  const [activeSection, setActiveSection] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // --- Real DB Hooks ---
  const { 
    propertyInfo: dbPropertyInfo, updatePropertyInfo, 
    roomTypes: dbRoomTypes, updateRoomTypes,
    dbRatePlans, updateRatePlan,
    dbTaxRates, updateTaxRate,
    dbPolicies, updatePolicies,
    dbPaymentMethods, updatePaymentMethods,
    dbGatewayConfig, updateGatewayConfig,
    dbPosOutlets, updatePosOutlets,
    dbPhoneConfig, updatePhoneConfig,
    dbDocTemplates, updateDocTemplates,
    dbLegalTexts, updateLegalTexts,
    dbLoyaltySetup, updateLoyaltySetup,
    dbRevenueConfig, updateRevenueConfig,
    dbMultiProperty, updateMultiProperty,
    dbRoomAdvancedConfig, updateRoomAdvancedConfig,
    dbOtaConfig, updateOtaConfig
  } = useFrontDeskSetup();
  const { data: dbRooms } = useRooms();
  const { addRoom, updateRoom, deleteRoom } = useRoomsMutations();

  // --- Local State for Forms ---
  
  // Section 1: Property & Hotel Info
  const [propertyInfo, setPropertyInfo] = useState<any>(null);

  // Section 2: Room Types
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [roomTypeModal, setRoomTypeModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", code: "", occupancy: 2, maxOccupancy: 4, basePrice: 100, status: "Active" },
    isEdit: false
  });

  // Section 3: Rooms Inventory
  const [roomModal, setRoomModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { roomNumber: "", type: "Standard Queen", floor: 1, capacity: 2, status: "available" },
    isEdit: false
  });
  const [floorPlanFilter, setFloorPlanFilter] = useState<number>(0); // 0 = All floors

  // Sync DB data to local state for editing
  useEffect(() => {
    if (dbPropertyInfo && !propertyInfo) setPropertyInfo(dbPropertyInfo);
  }, [dbPropertyInfo, propertyInfo]);

  useEffect(() => {
    if (dbRoomTypes) setRoomTypes(dbRoomTypes);
  }, [dbRoomTypes]);

  // Sync remaining DB data to local states
  const [policies, setPolicies] = useState<any>(null);
  useEffect(() => { if (dbPolicies && !policies) setPolicies(dbPolicies); }, [dbPolicies, policies]);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  useEffect(() => { if (dbPaymentMethods) setPaymentMethods(dbPaymentMethods); }, [dbPaymentMethods]);

  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  useEffect(() => { if (dbGatewayConfig && !gatewayConfig) setGatewayConfig(dbGatewayConfig); }, [dbGatewayConfig, gatewayConfig]);

  const [posOutlets, setPosOutlets] = useState<any[]>([]);
  useEffect(() => { if (dbPosOutlets) setPosOutlets(dbPosOutlets); }, [dbPosOutlets]);

  const [phoneConfig, setPhoneConfig] = useState<any>(null);
  useEffect(() => { if (dbPhoneConfig && !phoneConfig) setPhoneConfig(dbPhoneConfig); }, [dbPhoneConfig, phoneConfig]);

  const [docTemplates, setDocTemplates] = useState<Record<string, string>>({});
  useEffect(() => { 
    if (dbDocTemplates && Object.keys(docTemplates).length === 0) setDocTemplates(dbDocTemplates); 
  }, [dbDocTemplates, docTemplates]);

  const [legalTexts, setLegalTexts] = useState<any>(null);
  useEffect(() => { if (dbLegalTexts && !legalTexts) setLegalTexts(dbLegalTexts); }, [dbLegalTexts, legalTexts]);

  // New section states
  const [loyaltySetup, setLoyaltySetup] = useState<any>(null);
  useEffect(() => { if (dbLoyaltySetup && !loyaltySetup) setLoyaltySetup(dbLoyaltySetup); }, [dbLoyaltySetup, loyaltySetup]);

  const [revenueConfig, setRevenueConfig] = useState<any>(null);
  useEffect(() => { if (dbRevenueConfig && !revenueConfig) setRevenueConfig(dbRevenueConfig); }, [dbRevenueConfig, revenueConfig]);

  const [multiProperty, setMultiProperty] = useState<any>(null);
  useEffect(() => { if (dbMultiProperty && !multiProperty) setMultiProperty(dbMultiProperty); }, [dbMultiProperty, multiProperty]);

  const [roomAdvancedConfig, setRoomAdvancedConfig] = useState<any>(null);
  useEffect(() => { if (dbRoomAdvancedConfig && !roomAdvancedConfig) setRoomAdvancedConfig(dbRoomAdvancedConfig); }, [dbRoomAdvancedConfig, roomAdvancedConfig]);

  const [otaConfig, setOtaConfig] = useState<any>(null);
  useEffect(() => { if (dbOtaConfig && !otaConfig) setOtaConfig(dbOtaConfig); }, [dbOtaConfig, otaConfig]);

  // Use the database rooms
  const rooms = (dbRooms || []).map(r => ({
    id: r.id,
    roomNumber: r.room_number,
    type: r.room_type,
    floor: r.floor,
    capacity: r.capacity,
    status: r.status
  }));


  // Section 4: Rate Plans & Packages
  const ratePlans = (dbRatePlans || []).map(rp => ({
    id: rp.id,
    name: rp.name,
    code: rp.code,
    discountType: "percentage",
    discountValue: rp.discount_percentage,
    status: rp.is_active ? "Active" : "Inactive"
  }));
  const [ratePlanModal, setRatePlanModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", code: "", discountType: "percentage", discountValue: 10, status: "Active" },
    isEdit: false
  });

  const [packages, setPackages] = useState([
    { id: "pkg1", name: "Honeymoon Escape Package", totalCost: 199, components: ["Champagne on arrival", "Couple Massage (60 min)", "Romantic Set Dinner"], status: "Active" },
    { id: "pkg2", name: "Weekend Getaway Bundle", totalCost: 89, components: ["Daily Buffet Breakfast", "Late Check-out (2 PM)"], status: "Active" }
  ]);
  const [packageModal, setPackageModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", totalCost: 100, components: [], status: "Active" },
    isEdit: false
  });
  const [newComponentText, setNewComponentText] = useState("");

  // Section 5: Tax & Charges
  const taxGroups = (dbTaxRates || []).map(tr => ({
    id: tr.id,
    name: tr.name,
    rate: tr.rate,
    type: "Sales Tax",
    active: tr.is_active
  }));
  const [taxModal, setTaxModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", rate: 5, type: "Sales Tax", active: true },
    isEdit: false
  });

  const [chargeTypes, setChargeTypes] = useState([
    { id: "ct1", name: "Extra Bed Rollaway", category: "Accommodation", amount: 30, taxGroup: "Standard VAT" },
    { id: "ct2", name: "Airport Pick-up Shuttle", category: "Transportation", amount: 25, taxGroup: "Standard VAT" },
    { id: "ct3", name: "Room Service Flat Fee", category: "F&B", amount: 8, taxGroup: "Tourism Service Charge" }
  ]);
  const [chargeModal, setChargeModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", category: "Accommodation", amount: 10, taxGroup: "Standard VAT" },
    isEdit: false
  });

  // Handled by generic DB hooks

  // Section 7: Users, Roles & Security
  const [roles, setRoles] = useState([
    { id: "r_adm", name: "Hotel Administrator", code: "ADMIN", description: "Full privileges for setup, accounting, housekeeping, and front desk operations.", count: 3 },
    { id: "r_fds", name: "Front Desk Agent", code: "FRONT_DESK", description: "Reservations list, Check-in/out, folio items posting, guest keycard management.", count: 6 },
    { id: "r_hkp", name: "Housekeeping Manager", code: "HK_LEAD", description: "Updates room inventory cleaning status, lost & found logs, and schedules.", count: 4 }
  ]);
  const [roleModal, setRoleModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", code: "", description: "" },
    isEdit: false
  });

  const [activeRolePerms, setActiveRolePerms] = useState("FRONT_DESK");
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>>>({
    ADMIN: {
      "Dashboard & Stats": { read: true, write: true, delete: true },
      "Reservations Manager": { read: true, write: true, delete: true },
      "Billing & Folios": { read: true, write: true, delete: true },
      "Housekeeping Rooms": { read: true, write: true, delete: true },
      "Setup & Configurations": { read: true, write: true, delete: true }
    },
    FRONT_DESK: {
      "Dashboard & Stats": { read: true, write: false, delete: false },
      "Reservations Manager": { read: true, write: true, delete: false },
      "Billing & Folios": { read: true, write: true, delete: false },
      "Housekeeping Rooms": { read: true, write: false, delete: false },
      "Setup & Configurations": { read: true, write: false, delete: false }
    },
    HK_LEAD: {
      "Dashboard & Stats": { read: true, write: false, delete: false },
      "Reservations Manager": { read: false, write: false, delete: false },
      "Billing & Folios": { read: false, write: false, delete: false },
      "Housekeeping Rooms": { read: true, write: true, delete: false },
      "Setup & Configurations": { read: false, write: false, delete: false }
    }
  });

  const [users, setUsers] = useState([
    { id: "u1", name: "Johnathan Doe", username: "johndoe", email: "john@luxestay.com", role: "ADMIN", workstation: "Front Desk Main PC", status: "Active" },
    { id: "u2", name: "Jane Sarah Smith", username: "janesmith", email: "jane@luxestay.com", role: "FRONT_DESK", workstation: "Front Desk Term 2", status: "Active" },
    { id: "u3", name: "Ramesh Thapa", username: "ramesh_hk", email: "ramesh@luxestay.com", role: "HK_LEAD", workstation: "Mobile Tablet HK1", status: "Active" },
  ]);
  const [userModal, setUserModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", username: "", email: "", role: "FRONT_DESK", workstation: "Unassigned", status: "Active" },
    isEdit: false
  });

  // Section 8: Front Desk Policies

  // Section 9: Integration Settings
  const [posModal, setPosModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", apiEndpoint: "", status: "Disconnected", autoFolioCharge: false },
    isEdit: false
  });

  const [otaIntegrations, setOtaIntegrations] = useState([
    { id: "ota_b", name: "Booking.com Channel API", status: "Connected", activeRooms: 12, lastSync: "10 mins ago" },
    { id: "ota_e", name: "Expedia Partner Connect", status: "Connected", activeRooms: 8, lastSync: "14 mins ago" },
    { id: "ota_a", name: "Agoda Homes & Hotels Sync", status: "Connected", activeRooms: 6, lastSync: "1 hour ago" },
    { id: "ota_air", name: "Airbnb Direct Calendar", status: "Disconnected", activeRooms: 0, lastSync: "Never" },
  ]);
  const [isSyncingOTAs, setIsSyncingOTAs] = useState(false);

  // Section 10: Templates & Languages
  const [selectedDocTemplate, setSelectedDocTemplate] = useState("reg_card");

  const [messageTemplates, setMessageTemplates] = useState([
    { id: "mt1", name: "Welcome Pre-arrival Email", type: "Email", subject: "Your upcoming stay at LuxeStay Resort", body: "Hello {{guest_name}},\n\nWe are excited to welcome you on {{check_in_date}}. Let us know if you need airport shuttle pick-up." },
    { id: "mt2", name: "Online Check-in SMS Link", type: "SMS", subject: "", body: "Hi {{guest_name}}, skip the queue and check-in online here: https://luxestay.com/ci/{{reservation_id}}" },
    { id: "mt3", name: "Post Check-out Feedback Review", type: "Email", subject: "Thank you for staying at LuxeStay", body: "Dear {{guest_name}},\n\nWe hope you enjoyed your time with us. Please rate your stay: https://luxestay.com/feedback" }
  ]);
  const [msgTemplateModal, setMsgTemplateModal] = useState<{ open: boolean; data: any; isEdit: boolean }>({
    open: false,
    data: { name: "", type: "Email", subject: "", body: "" },
    isEdit: false
  });
  const [testSendModal, setTestSendModal] = useState({ open: false, target: "", templateId: "" });

  // legalTexts is fetched via dbLegalTexts

  // --- Helper Action Handlers for Interactivity ---
  
  const handleGeneralSave = (sectionName: string) => {
    setIsSaving(true);
    const stopSaving = () => setIsSaving(false);
    
    if (sectionName === "Property Info") {
      updatePropertyInfo.mutate(propertyInfo, { onSettled: stopSaving });
    } else if (sectionName === "Front-Desk Policies") {
      updatePolicies.mutate(policies, { onSettled: stopSaving });
    } else if (sectionName === "Payment Methods & Gateway") {
      updateGatewayConfig.mutate(gatewayConfig, { onSettled: stopSaving });
    } else if (sectionName === "Integration Settings") {
      updatePhoneConfig.mutate(phoneConfig, { onSettled: stopSaving });
    } else if (sectionName === "Templates & Language") {
      updateLegalTexts.mutate(legalTexts, { onSettled: () => {
        updateDocTemplates.mutate(docTemplates, { onSettled: stopSaving });
      }});
    } else if (sectionName === "Loyalty Setup") {
      updateLoyaltySetup.mutate(loyaltySetup, { onSettled: stopSaving });
    } else if (sectionName === "Revenue Config") {
      updateRevenueConfig.mutate(revenueConfig, { onSettled: stopSaving });
    } else if (sectionName === "Multi-Property Config") {
      updateMultiProperty.mutate(multiProperty, { onSettled: stopSaving });
    } else if (sectionName === "Room Advanced Config") {
      updateRoomAdvancedConfig.mutate(roomAdvancedConfig, { onSettled: stopSaving });
    } else if (sectionName === "OTA Config") {
      updateOtaConfig.mutate(otaConfig, { onSettled: stopSaving });
    } else {
      setTimeout(() => {
        stopSaving();
        toast.success(`${sectionName} saved successfully`);
      }, 800);
    }
  };

  // Dialog Operations
  const handleOpenRoomTypeDialog = (isEdit: boolean, item?: any) => {
    setRoomTypeModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", code: "", occupancy: 2, maxOccupancy: 4, basePrice: 100, status: "Active" }
    });
  };

  const handleSaveRoomType = () => {
    const data = roomTypeModal.data;
    if (!data.name || !data.code) {
      toast.error("Name and Code are required");
      return;
    }
    let newTypes;
    if (roomTypeModal.isEdit) {
      newTypes = roomTypes.map(item => item.id === data.id ? data : item);
    } else {
      const newItem = { ...data, id: "rt_" + Date.now() };
      newTypes = [...roomTypes, newItem];
    }
    updateRoomTypes.mutate(newTypes, {
      onSuccess: () => {
        toast.success(roomTypeModal.isEdit ? "Room Type updated" : "Room Type added");
        setRoomTypeModal({ ...roomTypeModal, open: false });
      }
    });
  };

  const handleDeleteRoomType = (id: string) => {
    const newTypes = roomTypes.filter(item => item.id !== id);
    updateRoomTypes.mutate(newTypes, {
      onSuccess: () => toast.success("Room Type deleted")
    });
  };

  const handleOpenRoomDialog = (isEdit: boolean, item?: any) => {
    setRoomModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { roomNumber: "", type: roomTypes[0]?.name || "Standard Queen", floor: 1, capacity: 2, status: "available" }
    });
  };

  const handleSaveRoom = () => {
    const data = roomModal.data;
    if (!data.roomNumber) {
      toast.error("Room Number is required");
      return;
    }
    
    if (roomModal.isEdit) {
      updateRoom.mutate({
        id: data.id,
        room_number: data.roomNumber,
        room_type: data.type,
        floor: data.floor,
        capacity: data.capacity,
        status: data.status
      }, {
        onSuccess: () => setRoomModal({ ...roomModal, open: false })
      });
    } else {
      addRoom.mutate({
        room_number: data.roomNumber,
        room_type: data.type,
        floor: data.floor,
        capacity: data.capacity,
        status: data.status,
        price_per_night: 0,
        amenities: [],
        description: ""
      }, {
        onSuccess: () => setRoomModal({ ...roomModal, open: false })
      });
    }
  };

  const handleDeleteRoom = (id: string) => {
    deleteRoom.mutate(id);
  };

  const handleOpenRatePlanDialog = (isEdit: boolean, item?: any) => {
    setRatePlanModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", code: "", discountType: "percentage", discountValue: 10, status: "Active" }
    });
  };

  const handleSaveRatePlan = () => {
    const data = ratePlanModal.data;
    if (!data.name || !data.code) {
      toast.error("Name and Code are required");
      return;
    }
    updateRatePlan.mutate(data, {
      onSuccess: () => {
        toast.success(ratePlanModal.isEdit ? "Rate Plan updated" : "Rate Plan added");
        setRatePlanModal({ ...ratePlanModal, open: false });
      }
    });
  };

  const handleOpenPackageDialog = (isEdit: boolean, item?: any) => {
    setPackageModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", totalCost: 100, components: [], status: "Active" }
    });
  };

  const handleSavePackage = () => {
    const data = packageModal.data;
    if (!data.name) {
      toast.error("Package Name is required");
      return;
    }
    if (packageModal.isEdit) {
      setPackages(prev => prev.map(item => item.id === data.id ? data : item));
      toast.success("Package bundle updated");
    } else {
      const newItem = { ...data, id: "pkg_" + Date.now() };
      setPackages(prev => [...prev, newItem]);
      toast.success("Package bundle added");
    }
    setPackageModal({ ...packageModal, open: false });
  };

  const handleAddComponentToPackage = () => {
    if (!newComponentText.trim()) return;
    setPackageModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        components: [...prev.data.components, newComponentText.trim()]
      }
    }));
    setNewComponentText("");
  };

  const handleRemoveComponentFromPackage = (index: number) => {
    setPackageModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        components: prev.data.components.filter((_: any, i: number) => i !== index)
      }
    }));
  };

  const handleOpenTaxDialog = (isEdit: boolean, item?: any) => {
    setTaxModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", rate: 5, type: "Sales Tax", active: true }
    });
  };

  const handleSaveTax = () => {
    const data = taxModal.data;
    if (!data.name) return;
    
    updateTaxRate.mutate(data, {
      onSuccess: () => {
        setTaxModal({ ...taxModal, open: false });
        toast.success("Tax Group configuration saved");
      }
    });
  };

  const handleOpenChargeDialog = (isEdit: boolean, item?: any) => {
    setChargeModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", category: "Accommodation", amount: 10, taxGroup: "Standard VAT" }
    });
  };

  const handleSaveCharge = () => {
    const data = chargeModal.data;
    if (!data.name) return;
    if (chargeModal.isEdit) {
      setChargeTypes(prev => prev.map(item => item.id === data.id ? data : item));
    } else {
      setChargeTypes(prev => [...prev, { ...data, id: "ct_" + Date.now() }]);
    }
    setChargeModal({ ...chargeModal, open: false });
    toast.success("Charge Type configuration saved");
  };

  const handleTogglePaymentMethod = (id: string, enabled: boolean) => {
    const newMethods = paymentMethods.map(item => item.id === id ? { ...item, enabled } : item);
    updatePaymentMethods.mutate(newMethods);
  };

  const handleOpenUserDialog = (isEdit: boolean, item?: any) => {
    setUserModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", username: "", email: "", role: "FRONT_DESK", workstation: "Unassigned", status: "Active" }
    });
  };

  const handleSaveUser = () => {
    const data = userModal.data;
    if (!data.name || !data.username) {
      toast.error("Name and Username are required");
      return;
    }
    if (userModal.isEdit) {
      setUsers(prev => prev.map(item => item.id === data.id ? data : item));
      toast.success("User profile updated");
    } else {
      setUsers(prev => [...prev, { ...data, id: "u_" + Date.now() }]);
      toast.success("User created successfully");
    }
    setUserModal({ ...userModal, open: false });
  };

  const handleOpenRoleDialog = (isEdit: boolean, item?: any) => {
    setRoleModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", code: "", description: "" }
    });
  };

  const handleSaveRole = () => {
    const data = roleModal.data;
    if (!data.name || !data.code) return;
    if (roleModal.isEdit) {
      setRoles(prev => prev.map(item => item.id === data.id ? data : item));
    } else {
      setRoles(prev => [...prev, { ...data, id: "r_" + Date.now(), count: 0 }]);
      setPermissionsMatrix(prev => ({
        ...prev,
        [data.code]: {
          "Dashboard & Stats": { read: false, write: false, delete: false },
          "Reservations Manager": { read: false, write: false, delete: false },
          "Billing & Folios": { read: false, write: false, delete: false },
          "Housekeeping Rooms": { read: false, write: false, delete: false },
          "Setup & Configurations": { read: false, write: false, delete: false }
        }
      }));
    }
    setRoleModal({ ...roleModal, open: false });
    toast.success("Role created. Configure permissions below.");
  };

  const handleTogglePermission = (role: string, module: string, type: "read" | "write" | "delete") => {
    setPermissionsMatrix(prev => {
      const current = prev[role][module];
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: {
            ...current,
            [type]: !current[type]
          }
        }
      };
    });
  };

  const handleOpenPOSDialog = (isEdit: boolean, item?: any) => {
    setPosModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", apiEndpoint: "", status: "Disconnected", autoFolioCharge: false }
    });
  };

  const handleSavePOS = () => {
    const data = posModal.data;
    if (!data.name) return;
    
    let newOutlets;
    if (posModal.isEdit) {
      newOutlets = posOutlets.map(item => item.id === data.id ? data : item);
    } else {
      newOutlets = [...posOutlets, { ...data, id: "pos_" + Date.now() }];
    }
    
    updatePosOutlets.mutate(newOutlets, {
      onSuccess: () => {
        setPosModal({ ...posModal, open: false });
        toast.success("POS integration parameters saved");
      }
    });
  };

  const handleSyncOTAs = () => {
    setIsSyncingOTAs(true);
    toast.info("Connecting to channel controllers and fetching bookings...");
    setTimeout(() => {
      setIsSyncingOTAs(false);
      setOtaIntegrations(prev => prev.map(ota => ota.status === "Connected" ? { ...ota, lastSync: "Just now" } : ota));
      toast.success("OTAs successfully synchronized!");
    }, 2000);
  };

  const handleOpenMsgTemplateDialog = (isEdit: boolean, item?: any) => {
    setMsgTemplateModal({
      open: true,
      isEdit,
      data: isEdit ? { ...item } : { name: "", type: "Email", subject: "", body: "" }
    });
  };

  const handleSaveMsgTemplate = () => {
    const data = msgTemplateModal.data;
    if (!data.name) return;
    if (msgTemplateModal.isEdit) {
      setMessageTemplates(prev => prev.map(item => item.id === data.id ? data : item));
    } else {
      setMessageTemplates(prev => [...prev, { ...data, id: "mt_" + Date.now() }]);
    }
    setMsgTemplateModal({ ...msgTemplateModal, open: false });
    toast.success("Message template saved");
  };

  const handleTestSend = () => {
    if (!testSendModal.target) {
      toast.error("Please enter a destination contact address");
      return;
    }
    toast.loading("Sending test communication...");
    setTimeout(() => {
      toast.dismiss();
      toast.success(`Test template successfully dispatched to ${testSendModal.target}`);
      setTestSendModal({ open: false, target: "", templateId: "" });
    }, 1500);
  };

  // Left Panel Navigation Tree Items
  const setupNavItems = [
    { id: 1, label: "Property & Hotel Info", icon: Building },
    { id: 2, label: "Room Types", icon: Layers },
    { id: 3, label: "Rooms Inventory", icon: Bed },
    { id: 4, label: "Rate Plans & Packages", icon: Tags },
    { id: 5, label: "Tax & Charges", icon: Percent },
    { id: 6, label: "Payment & Gateway", icon: CreditCard },
    { id: 7, label: "Users, Roles & Security", icon: Users2 },
    { id: 8, label: "Front-Desk Policies", icon: Shield },
    { id: 9, label: "Integration Settings", icon: Network },
    { id: 10, label: "Templates & Language", icon: FileText },
    { id: 11, label: "Loyalty & Membership", icon: Crown },
    { id: 12, label: "Revenue Management", icon: TrendingUp },
    { id: 13, label: "Multi-Property Setup", icon: Building2 }
  ];

  if (!propertyInfo || !policies || !gatewayConfig || !phoneConfig || !legalTexts || !docTemplates || !docTemplates[selectedDocTemplate] || !loyaltySetup || !revenueConfig || !multiProperty) {
    return (
      <div className="lg:col-span-4 flex flex-col items-center justify-center p-12 h-[450px] w-full bg-secondary/5 rounded-2xl border border-border/50 backdrop-blur-md">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-semibold text-foreground">Loading Setup Configurations...</p>
        <p className="text-xs text-muted-foreground mt-1">Retrieving hotel parameters from database...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-hidden">
      {/* Sidebar Navigation Tree */}
      <Card variant="flat" className="lg:col-span-1 border border-border/50 bg-secondary/10 flex flex-col h-full overflow-y-auto scrollbar-hide">
        <CardHeader className="py-4 px-5 border-b border-border/50 flex-shrink-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Laptop className="h-4 w-4 text-primary" /> Setup Menu
          </CardTitle>
          <CardDescription className="text-xs">Hotel system global parameters</CardDescription>
        </CardHeader>
        <CardContent className="p-2 flex flex-col gap-1 overflow-y-auto">
          {setupNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-3 px-3 py-2 h-10 w-full text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary border-l-2 border-primary hover:bg-primary/20" 
                    : "text-muted-foreground hover:bg-secondary/40"
                )}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Right Content Panel */}
      <div className="lg:col-span-3 h-full flex flex-col overflow-hidden">
        <Card variant="flat" className="h-full flex flex-col overflow-hidden border border-border/50 bg-background/50">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            
            {/* 1. PROPERTY & HOTEL INFO (enhanced) */}
            {activeSection === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Property & Hotel Information</h2>
                  <p className="text-sm text-muted-foreground">General details, currencies, seasons, emergency contacts, and ID document types.</p>
                </div>

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="general" className="px-3 text-xs">General</TabsTrigger>
                    <TabsTrigger value="currencies" className="px-3 text-xs">Currencies</TabsTrigger>
                    <TabsTrigger value="seasons" className="px-3 text-xs">Seasons</TabsTrigger>
                    <TabsTrigger value="emergency" className="px-3 text-xs">Emergency</TabsTrigger>
                    <TabsTrigger value="idtypes" className="px-3 text-xs">ID Types</TabsTrigger>
                  </TabsList>

                  {/* General Tab */}
                  <TabsContent value="general" className="space-y-4 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Property Name</Label><Input value={propertyInfo.name} onChange={(e) => setPropertyInfo({...propertyInfo, name: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Tax/VAT Number</Label><Input value={propertyInfo.taxNumber} onChange={(e) => setPropertyInfo({...propertyInfo, taxNumber: e.target.value})} /></div>
                      <div className="space-y-2 md:col-span-2"><Label>Street Address</Label><Input value={propertyInfo.address} onChange={(e) => setPropertyInfo({...propertyInfo, address: e.target.value})} /></div>
                      <div className="space-y-2"><Label>City</Label><Input value={propertyInfo.city} onChange={(e) => setPropertyInfo({...propertyInfo, city: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Country</Label><Input value={propertyInfo.country} onChange={(e) => setPropertyInfo({...propertyInfo, country: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Reception Phone</Label><Input value={propertyInfo.phone} onChange={(e) => setPropertyInfo({...propertyInfo, phone: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Booking Email</Label><Input value={propertyInfo.email} onChange={(e) => setPropertyInfo({...propertyInfo, email: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Website URL</Label><Input value={propertyInfo.website} onChange={(e) => setPropertyInfo({...propertyInfo, website: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Timezone</Label><Input value={propertyInfo.timezone || ""} onChange={(e) => setPropertyInfo({...propertyInfo, timezone: e.target.value})} /></div>
                    </div>
                  </TabsContent>

                  {/* Currencies Tab */}
                  <TabsContent value="currencies" className="space-y-4 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label>Base Operating Currency</Label>
                        <Select value={propertyInfo.currency} onValueChange={(v) => setPropertyInfo({...propertyInfo, currency: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NPR">NPR (Rs.)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="INR">INR (₹)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Exchange Rate Rule</Label>
                        <Select value={propertyInfo.exchangeRateRule || "daily_manual"} onValueChange={(v) => setPropertyInfo({...propertyInfo, exchangeRateRule: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily_manual">Daily Manual Update</SelectItem>
                            <SelectItem value="auto_api">Auto API Sync</SelectItem>
                            <SelectItem value="fixed">Fixed Rate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Label className="text-sm font-bold">Alternate Accepted Currencies</Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/30"><TableHead>Currency</TableHead><TableHead>Code</TableHead><TableHead>Exchange Rate</TableHead><TableHead>Enabled</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(propertyInfo.alternateCurrencies || []).map((c: any, i: number) => (
                            <TableRow key={i} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold">{c.name}</TableCell>
                              <TableCell className="font-mono text-xs">{c.code}</TableCell>
                              <TableCell><Input type="number" step="0.1" className="w-24 h-8 text-xs" value={c.exchangeRate} onChange={(e) => { const arr = [...propertyInfo.alternateCurrencies]; arr[i] = {...c, exchangeRate: Number(e.target.value)}; setPropertyInfo({...propertyInfo, alternateCurrencies: arr}); }} /></TableCell>
                              <TableCell><Switch checked={c.enabled} onCheckedChange={(v) => { const arr = [...propertyInfo.alternateCurrencies]; arr[i] = {...c, enabled: v}; setPropertyInfo({...propertyInfo, alternateCurrencies: arr}); }} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Seasons Tab */}
                  <TabsContent value="seasons" className="space-y-4 focus-visible:outline-none">
                    <Label className="text-sm font-bold">Operational Season / Period Flags</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(propertyInfo.seasons || []).map((s: any, i: number) => (
                        <div key={s.id} className={cn("p-3 rounded-lg border space-y-2", s.type === "peak" && "border-amber-500/30 bg-amber-500/5", s.type === "off-peak" && "border-blue-500/30 bg-blue-500/5", s.type === "festival" && "border-purple-500/30 bg-purple-500/5", s.type === "low-season" && "border-slate-500/30 bg-slate-500/5")}>
                          <div className="flex items-center justify-between">
                            <Input className="h-7 text-xs font-bold w-40" value={s.name} onChange={(e) => { const arr = [...propertyInfo.seasons]; arr[i] = {...s, name: e.target.value}; setPropertyInfo({...propertyInfo, seasons: arr}); }} />
                            <Badge variant="outline" className="text-[10px]">{s.type}</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1"><Label className="text-[10px]">Start</Label><Input className="h-7 text-xs" value={s.startMonth} onChange={(e) => { const arr = [...propertyInfo.seasons]; arr[i] = {...s, startMonth: e.target.value}; setPropertyInfo({...propertyInfo, seasons: arr}); }} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">End</Label><Input className="h-7 text-xs" value={s.endMonth} onChange={(e) => { const arr = [...propertyInfo.seasons]; arr[i] = {...s, endMonth: e.target.value}; setPropertyInfo({...propertyInfo, seasons: arr}); }} /></div>
                            <div className="space-y-1"><Label className="text-[10px]">Rate %</Label><Input type="number" className="h-7 text-xs" value={s.rateModifier} onChange={(e) => { const arr = [...propertyInfo.seasons]; arr[i] = {...s, rateModifier: Number(e.target.value)}; setPropertyInfo({...propertyInfo, seasons: arr}); }} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Emergency Tab */}
                  <TabsContent value="emergency" className="space-y-4 focus-visible:outline-none">
                    <Label className="text-sm font-bold">Emergency / Blackout Contact List</Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/30"><TableHead>Role</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Available</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(propertyInfo.emergencyContacts || []).map((ec: any, i: number) => (
                            <TableRow key={ec.id} className="hover:bg-secondary/20">
                              <TableCell><Input className="h-7 text-xs w-32" value={ec.role} onChange={(e) => { const arr = [...propertyInfo.emergencyContacts]; arr[i] = {...ec, role: e.target.value}; setPropertyInfo({...propertyInfo, emergencyContacts: arr}); }} /></TableCell>
                              <TableCell><Input className="h-7 text-xs" value={ec.name} onChange={(e) => { const arr = [...propertyInfo.emergencyContacts]; arr[i] = {...ec, name: e.target.value}; setPropertyInfo({...propertyInfo, emergencyContacts: arr}); }} /></TableCell>
                              <TableCell><Input className="h-7 text-xs" value={ec.phone} onChange={(e) => { const arr = [...propertyInfo.emergencyContacts]; arr[i] = {...ec, phone: e.target.value}; setPropertyInfo({...propertyInfo, emergencyContacts: arr}); }} /></TableCell>
                              <TableCell><Input className="h-7 text-xs w-24" value={ec.available} onChange={(e) => { const arr = [...propertyInfo.emergencyContacts]; arr[i] = {...ec, available: e.target.value}; setPropertyInfo({...propertyInfo, emergencyContacts: arr}); }} /></TableCell>
                              <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPropertyInfo({...propertyInfo, emergencyContacts: propertyInfo.emergencyContacts.filter((_: any, idx: number) => idx !== i)})}><Trash2 className="h-3 w-3" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setPropertyInfo({...propertyInfo, emergencyContacts: [...(propertyInfo.emergencyContacts || []), { id: "ec_" + Date.now(), role: "", name: "", phone: "", available: "24/7" }]})}><Plus className="h-4 w-4 mr-1" /> Add Contact</Button>
                  </TabsContent>

                  {/* ID Types Tab */}
                  <TabsContent value="idtypes" className="space-y-4 focus-visible:outline-none">
                    <Label className="text-sm font-bold">Accepted ID / Document Types for Guest Registration</Label>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/30"><TableHead>Document Name</TableHead><TableHead>Code</TableHead><TableHead>Required</TableHead><TableHead>Foreign Only</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {(propertyInfo.idTypes || []).map((id: any, i: number) => (
                            <TableRow key={id.id} className="hover:bg-secondary/20">
                              <TableCell><Input className="h-7 text-xs" value={id.name} onChange={(e) => { const arr = [...propertyInfo.idTypes]; arr[i] = {...id, name: e.target.value}; setPropertyInfo({...propertyInfo, idTypes: arr}); }} /></TableCell>
                              <TableCell className="font-mono text-xs">{id.code}</TableCell>
                              <TableCell><Switch checked={id.required} onCheckedChange={(v) => { const arr = [...propertyInfo.idTypes]; arr[i] = {...id, required: v}; setPropertyInfo({...propertyInfo, idTypes: arr}); }} /></TableCell>
                              <TableCell><Switch checked={id.foreignOnly} onCheckedChange={(v) => { const arr = [...propertyInfo.idTypes]; arr[i] = {...id, foreignOnly: v}; setPropertyInfo({...propertyInfo, idTypes: arr}); }} /></TableCell>
                              <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setPropertyInfo({...propertyInfo, idTypes: propertyInfo.idTypes.filter((_: any, idx: number) => idx !== i)})}><Trash2 className="h-3 w-3" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setPropertyInfo({...propertyInfo, idTypes: [...(propertyInfo.idTypes || []), { id: "id_" + Date.now(), name: "", code: "NEW", required: false, foreignOnly: false }]})}><Plus className="h-4 w-4 mr-1" /> Add ID Type</Button>
                  </TabsContent>
                </Tabs>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button onClick={() => handleGeneralSave("Property Info")} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save Info"}
                  </Button>
                </div>
              </div>
            )}

            {/* 2. ROOM TYPES */}
            {activeSection === 2 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold font-display text-gradient-blue">Room Types Catalog</h2>
                    <p className="text-sm text-muted-foreground">Manage structural definitions, pricing structures, and occupancies for rooms.</p>
                  </div>
                  <Button size="sm" onClick={() => handleOpenRoomTypeDialog(false)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Room Type
                  </Button>
                </div>
                
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Type Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Standard Occupancy</TableHead>
                        <TableHead>Max Occupancy</TableHead>
                        <TableHead>Base price/night</TableHead>
                        <TableHead>Segment</TableHead>
                        <TableHead>Blocking Rule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roomTypes.map((rt) => (
                        <TableRow key={rt.id} className="hover:bg-secondary/20">
                          <TableCell className="font-semibold text-foreground">{rt.name}</TableCell>
                          <TableCell className="font-mono text-xs">{rt.code}</TableCell>
                          <TableCell>{rt.occupancy} guests</TableCell>
                          <TableCell>{rt.maxOccupancy} guests</TableCell>
                          <TableCell className="font-semibold text-primary">{formatCurrency(rt.basePrice)}</TableCell>
                          <TableCell><Badge variant="outline">{rt.segment || "Standard"}</Badge></TableCell>
                          <TableCell>
                            {rt.blockingRule === "vip_only" && <Badge variant="secondary" className="bg-purple-100 text-purple-700">VIP Only</Badge>}
                            {rt.blockingRule === "manager_approval" && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Needs Approval</Badge>}
                            {(!rt.blockingRule || rt.blockingRule === "none") && <span className="text-xs text-muted-foreground">None</span>}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rt.status === "Active" ? "success" : "secondary"}>{rt.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenRoomTypeDialog(true, rt)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoomType(rt.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 3. ROOMS INVENTORY */}
            {activeSection === 3 && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold font-display text-gradient-blue">Rooms Inventory</h2>
                    <p className="text-sm text-muted-foreground">List physical rooms, floor plans, and housekeeping integration links.</p>
                  </div>
                  <Button size="sm" onClick={() => handleOpenRoomDialog(false)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Room
                  </Button>
                </div>

                <Tabs defaultValue="list" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="list" className="px-4">Rooms List Grid</TabsTrigger>
                    <TabsTrigger value="floor-plan" className="px-4">Interactive Floor Plan</TabsTrigger>
                  </TabsList>
                  
                  {/* Rooms list tab */}
                  <TabsContent value="list" className="focus-visible:outline-none">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Room Number</TableHead>
                            <TableHead>Room Type</TableHead>
                            <TableHead>Floor</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.map((room) => (
                            <TableRow key={room.id} className="hover:bg-secondary/20">
                              <TableCell className="font-bold text-foreground font-mono text-base">{room.roomNumber}</TableCell>
                              <TableCell>{room.type}</TableCell>
                              <TableCell>Floor {room.floor}</TableCell>
                              <TableCell>{room.capacity} guests</TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    room.status === "available" && "bg-success/10 text-success border-success/30",
                                    room.status === "occupied" && "bg-primary/10 text-primary border-primary/30",
                                    room.status === "cleaning" && "bg-warning/10 text-warning border-warning/30",
                                    room.status === "maintenance" && "bg-destructive/10 text-destructive border-destructive/30"
                                  )}
                                >
                                  {room.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenRoomDialog(true, room)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Floor plan view tab */}
                  <TabsContent value="floor-plan" className="focus-visible:outline-none">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm font-semibold">Filter Floor:</Label>
                        <div className="flex gap-2">
                          <Button size="sm" variant={floorPlanFilter === 0 ? "secondary" : "outline"} onClick={() => setFloorPlanFilter(0)}>All Floors</Button>
                          <Button size="sm" variant={floorPlanFilter === 1 ? "secondary" : "outline"} onClick={() => setFloorPlanFilter(1)}>1st Floor</Button>
                          <Button size="sm" variant={floorPlanFilter === 2 ? "secondary" : "outline"} onClick={() => setFloorPlanFilter(2)}>2nd Floor</Button>
                          <Button size="sm" variant={floorPlanFilter === 3 ? "secondary" : "outline"} onClick={() => setFloorPlanFilter(3)}>3rd Floor</Button>
                        </div>
                      </div>

                      <div className="border border-border/50 rounded-xl p-6 bg-secondary/5 space-y-6">
                        {[1, 2, 3].filter(f => floorPlanFilter === 0 || floorPlanFilter === f).map(floor => (
                          <div key={floor} className="space-y-3">
                            <h3 className="text-sm font-bold text-muted-foreground border-b border-border/50 pb-1">FLOOR {floor}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                              {rooms.filter(r => r.floor === floor).map(room => (
                                <div 
                                  key={room.id} 
                                  className={cn(
                                    "p-3 rounded-lg border flex flex-col justify-between h-24 hover:shadow-glow cursor-pointer transition-all duration-200 group relative",
                                    room.status === "available" && "bg-success/5 border-success/30 hover:border-success",
                                    room.status === "occupied" && "bg-primary/5 border-primary/30 hover:border-primary",
                                    room.status === "cleaning" && "bg-warning/5 border-warning/30 hover:border-warning",
                                    room.status === "maintenance" && "bg-destructive/5 border-destructive/30 hover:border-destructive"
                                  )}
                                  onClick={() => {
                                    // Cycle through statuses for interactivity demo
                                    const nextStatusMap: Record<string, string> = {
                                      "available": "occupied",
                                      "occupied": "cleaning",
                                      "cleaning": "maintenance",
                                      "maintenance": "available"
                                    };
                                    updateRoom.mutate({ id: room.id, status: nextStatusMap[room.status] }, {
                                      onSuccess: () => toast.info(`Room ${room.roomNumber} updated to ${nextStatusMap[room.status]}`)
                                    });
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <span className="font-mono font-bold text-lg">{room.roomNumber}</span>
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[60px]">{room.type.split(" ")[0]}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                    <span className={cn(
                                      "text-[10px] font-bold uppercase",
                                      room.status === "available" && "text-success",
                                      room.status === "occupied" && "text-primary",
                                      room.status === "cleaning" && "text-warning",
                                      room.status === "maintenance" && "text-destructive"
                                    )}>
                                      {room.status}
                                    </span>
                                  </div>
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] font-semibold text-primary">Click to Toggle Status</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 4. RATE PLANS & PACKAGES */}
            {activeSection === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Rate Plans & Packages</h2>
                  <p className="text-sm text-muted-foreground">Setup pricing configurations, seasonal campaigns, and bundled hotel packages.</p>
                </div>

                <Tabs defaultValue="rates" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="rates" className="px-4">Rate Plans (Dynamic pricing)</TabsTrigger>
                    <TabsTrigger value="packages" className="px-4">Bundled Packages</TabsTrigger>
                  </TabsList>
                  
                  {/* Rate plans tab */}
                  <TabsContent value="rates" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenRatePlanDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Rate Plan
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Plan Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Discount / Modifier</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ratePlans.map((plan) => (
                            <TableRow key={plan.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{plan.name}</TableCell>
                              <TableCell className="font-mono text-xs">{plan.code}</TableCell>
                              <TableCell>
                                {plan.discountValue === 0 ? "Standard Base Rate" : `${plan.discountValue}${plan.discountType === "percentage" ? "%" : " flat"} discount`}
                              </TableCell>
                              <TableCell><Badge variant={plan.status === "Active" ? "success" : "secondary"}>{plan.status}</Badge></TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenRatePlanDialog(true, plan)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Packages tab */}
                  <TabsContent value="packages" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenPackageDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Create Package
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Package Name</TableHead>
                            <TableHead>Add-on Components Included</TableHead>
                            <TableHead>Total Cost Extra</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {packages.map((pkg) => (
                            <TableRow key={pkg.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{pkg.name}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {pkg.components.map((c, i) => (
                                    <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="font-bold text-primary">{formatCurrency(pkg.totalCost)}</TableCell>
                              <TableCell><Badge variant={pkg.status === "Active" ? "success" : "secondary"}>{pkg.status}</Badge></TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenPackageDialog(true, pkg)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 5. TAX & CHARGES */}
            {activeSection === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Tax Groups & Charge Types</h2>
                  <p className="text-sm text-muted-foreground">Standardize VAT rate brackets, service charges, and custom billing items.</p>
                </div>

                <Tabs defaultValue="taxes" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="taxes" className="px-4">Tax Groups</TabsTrigger>
                    <TabsTrigger value="charges" className="px-4">Folio Charge Items</TabsTrigger>
                  </TabsList>
                  
                  {/* Tax groups tab */}
                  <TabsContent value="taxes" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenTaxDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Tax Bracket
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Tax Group Name</TableHead>
                            <TableHead>Percentage Rate</TableHead>
                            <TableHead>Classification</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taxGroups.map((tax) => (
                            <TableRow key={tax.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{tax.name}</TableCell>
                              <TableCell className="font-mono font-bold text-primary">{tax.rate}%</TableCell>
                              <TableCell>{tax.type}</TableCell>
                              <TableCell>
                                <Badge variant={tax.active ? "success" : "secondary"}>
                                  {tax.active ? "Active" : "Disabled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenTaxDialog(true, tax)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Charge Types tab */}
                  <TabsContent value="charges" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenChargeDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Charge Item
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Charge Name</TableHead>
                            <TableHead>Service Category</TableHead>
                            <TableHead>Standard Cost</TableHead>
                            <TableHead>Applied Tax Bracket</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chargeTypes.map((charge) => (
                            <TableRow key={charge.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{charge.name}</TableCell>
                              <TableCell>{charge.category}</TableCell>
                              <TableCell className="font-bold text-primary">{formatCurrency(charge.amount)}</TableCell>
                              <TableCell><Badge variant="outline">{charge.taxGroup}</Badge></TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenChargeDialog(true, charge)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 6. PAYMENT & GATEWAY */}
            {activeSection === 6 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Payment Methods & Gateways</h2>
                  <p className="text-sm text-muted-foreground">Setup billing method parameters and link digital gateway merchant APIs.</p>
                </div>

                <Tabs defaultValue="methods" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="methods" className="px-4">Accepted Payment Methods</TabsTrigger>
                    <TabsTrigger value="gateway" className="px-4">Merchant Gateways (Stripe/eSewa)</TabsTrigger>
                  </TabsList>
                  
                  {/* Payment methods tab */}
                  <TabsContent value="methods" className="focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paymentMethods.map((pm) => (
                        <Card key={pm.id} className="border border-border/50 bg-secondary/5">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-foreground">{pm.name}</p>
                              <p className="text-xs text-muted-foreground">System Code: {pm.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{pm.enabled ? "Enabled" : "Disabled"}</span>
                              <Switch checked={pm.enabled} onCheckedChange={(val) => handleTogglePaymentMethod(pm.id, val)} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Payment gateway tab */}
                  <TabsContent value="gateway" className="space-y-4 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Select Primary Provider</Label>
                        <Select value={gatewayConfig.provider} onValueChange={(val) => setGatewayConfig({...gatewayConfig, provider: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stripe">Stripe international</SelectItem>
                            <SelectItem value="esewa">eSewa Nepal SDK</SelectItem>
                            <SelectItem value="razorpay">Razorpay Checkout</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-lg border w-full">
                          <Switch 
                            checked={gatewayConfig.sandboxMode} 
                            onCheckedChange={(val) => setGatewayConfig({...gatewayConfig, sandboxMode: val})} 
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">Sandbox (Testing) Mode</span>
                            <span className="text-[10px] text-muted-foreground">Redirect transactions through mock testing routes.</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>API Key (Publishable Key)</Label>
                        <Input value={gatewayConfig.apiKey} onChange={(e) => setGatewayConfig({...gatewayConfig, apiKey: e.target.value})} type="password" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Secret / Private Key</Label>
                        <Input value={gatewayConfig.secretKey} onChange={(e) => setGatewayConfig({...gatewayConfig, secretKey: e.target.value})} type="password" />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Callback / Webhook Endpoint</Label>
                        <Input value={gatewayConfig.webhookUrl} readOnly className="bg-secondary/40 font-mono text-xs" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button onClick={() => handleGeneralSave("Gateway API settings")}>
                        <Save className="h-4 w-4 mr-2" /> Save Integration Keys
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 7. USERS, ROLES & SECURITY */}
            {activeSection === 7 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Users, Roles & Security</h2>
                  <p className="text-sm text-muted-foreground">Manage system operator profiles, permissions matrix, and role classifications.</p>
                </div>

                <Tabs defaultValue="users" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="users" className="px-4">Active Users</TabsTrigger>
                    <TabsTrigger value="roles" className="px-4">Role Definitions</TabsTrigger>
                    <TabsTrigger value="permissions" className="px-4">Permissions Matrix</TabsTrigger>
                  </TabsList>
                  
                  {/* Users tab */}
                  <TabsContent value="users" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenUserDialog(false)} className="gap-2">
                        <UserPlus className="h-4 w-4" /> Create User
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Full Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Assigned Role</TableHead>
                            <TableHead>Default Workstation</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold">{user.name}</TableCell>
                              <TableCell className="font-mono text-xs text-primary">{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                              <TableCell>{user.workstation}</TableCell>
                              <TableCell>
                                <Badge variant={user.status === "Active" ? "success" : "secondary"}>{user.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right space-x-1 text-nowrap">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenUserDialog(true, user)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Reset Password" onClick={() => toast.success(`Password reset email dispatched to ${user.email}`)}>
                                  <Key className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Roles tab */}
                  <TabsContent value="roles" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenRoleDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Role
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Role Name</TableHead>
                            <TableHead>System Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Active Members</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roles.map((role) => (
                            <TableRow key={role.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold">{role.name}</TableCell>
                              <TableCell className="font-mono text-xs">{role.code}</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-sm truncate">{role.description}</TableCell>
                              <TableCell className="font-bold">{role.count} operators</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Permissions matrix tab */}
                  <TabsContent value="permissions" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <Label className="font-bold text-sm">Select Role Group:</Label>
                        <Select value={activeRolePerms} onValueChange={setActiveRolePerms}>
                          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => (
                              <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" onClick={() => handleGeneralSave("Role permissions matrix")}>
                        <Save className="h-4 w-4 mr-2" /> Save Matrix
                      </Button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Module / Area</TableHead>
                            <TableHead className="text-center w-32">Read</TableHead>
                            <TableHead className="text-center w-32">Write / Edit</TableHead>
                            <TableHead className="text-center w-32">Delete</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {permissionsMatrix[activeRolePerms] && Object.entries(permissionsMatrix[activeRolePerms]).map(([module, perms]) => (
                            <TableRow key={module} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold">{module}</TableCell>
                              <TableCell className="text-center">
                                <Checkbox 
                                  checked={perms.read} 
                                  onCheckedChange={() => handleTogglePermission(activeRolePerms, module, "read")} 
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox 
                                  checked={perms.write} 
                                  onCheckedChange={() => handleTogglePermission(activeRolePerms, module, "write")} 
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Checkbox 
                                  checked={perms.delete} 
                                  onCheckedChange={() => handleTogglePermission(activeRolePerms, module, "delete")} 
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 8. FRONT DESK POLICIES */}
            {activeSection === 8 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Front-Desk Policies & Defaults</h2>
                  <p className="text-sm text-muted-foreground">Standardize billing thresholds, deposit rules, and automated posting schedules.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card Section: Check-in / out */}
                  <Card className="border border-border/50 bg-secondary/5">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Check-in & Check-out Thresholds
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Check-in Grace Period (Minutes)</Label>
                        <Input 
                          type="number" 
                          value={policies.checkInGraceMinutes} 
                          onChange={(e) => setPolicies({...policies, checkInGraceMinutes: Number(e.target.value)})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Early Check-in hour threshold (charges trigger before this)</Label>
                        <Input 
                          type="number" 
                          value={policies.earlyCheckInHourLimit} 
                          onChange={(e) => setPolicies({...policies, earlyCheckInHourLimit: Number(e.target.value)})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Early Check-in Fee Flat Price</Label>
                        <Input 
                          type="number" 
                          value={policies.earlyCheckInFee} 
                          onChange={(e) => setPolicies({...policies, earlyCheckInFee: Number(e.target.value)})} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Section: Deposit / Cancellation */}
                  <Card className="border border-border/50 bg-secondary/5">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" /> Deposit & Cancellation Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-2 bg-secondary/20 rounded border">
                        <Label className="cursor-pointer">Guarantee Deposit Required</Label>
                        <Switch 
                          checked={policies.depositRequired} 
                          onCheckedChange={(val) => setPolicies({...policies, depositRequired: val})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deposit Percentage % of stay total</Label>
                        <Input 
                          type="number" 
                          value={policies.depositPercentage} 
                          disabled={!policies.depositRequired}
                          onChange={(e) => setPolicies({...policies, depositPercentage: Number(e.target.value)})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cancellation Window (Hours prior to arrival)</Label>
                        <Input 
                          type="number" 
                          value={policies.cancellationWindowHours} 
                          onChange={(e) => setPolicies({...policies, cancellationWindowHours: Number(e.target.value)})} 
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Section: Automated Posting */}
                  <Card className="border border-border/50 bg-secondary/5 md:col-span-2">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-primary" /> Automatic Night Audits & Auto-Post
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Auto-Post Room Charge Time</Label>
                        <Input 
                          type="time" 
                          value={policies.autoPostRoomChargesTime} 
                          onChange={(e) => setPolicies({...policies, autoPostRoomChargesTime: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Default Posting Tax Group</Label>
                        <Select value={policies.defaultTaxGroup} onValueChange={(v) => setPolicies({...policies, defaultTaxGroup: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {taxGroups.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Late Check-out Fee Flat Price</Label>
                        <Input 
                          type="number" 
                          value={policies.lateCheckOutFee} 
                          onChange={(e) => setPolicies({...policies, lateCheckOutFee: Number(e.target.value)})} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                  {/* Card Section: Advanced Rules (New) */}
                  <Card className="border border-border/50 bg-secondary/5 md:col-span-2">
                    <CardHeader className="py-4">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" /> Advanced Policy Configurations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Corporate Policies */}
                      <div className="space-y-4 p-4 border rounded-lg bg-background">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Corporate & Agency Policies</Label>
                          <Switch checked={policies.corporatePolicyEnabled} onCheckedChange={(v) => setPolicies({...policies, corporatePolicyEnabled: v})} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Waive Deposit Requirement</span>
                          <Switch disabled={!policies.corporatePolicyEnabled} checked={policies.corporateNoDeposit} onCheckedChange={(v) => setPolicies({...policies, corporateNoDeposit: v})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Default Credit Limit (NPR)</Label>
                          <Input disabled={!policies.corporatePolicyEnabled} type="number" value={policies.corporateCreditLimitDefault} onChange={(e) => setPolicies({...policies, corporateCreditLimitDefault: Number(e.target.value)})} />
                        </div>
                      </div>

                      {/* Upsell Rules */}
                      <div className="space-y-4 p-4 border rounded-lg bg-background">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">Front-Desk Upsell Rules</Label>
                          <Switch checked={policies.upsellEnabled} onCheckedChange={(v) => setPolicies({...policies, upsellEnabled: v})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Min. Available Rooms to Suggest Upsell</Label>
                          <Input disabled={!policies.upsellEnabled} type="number" value={policies.upsellMinAvailableRooms} onChange={(e) => setPolicies({...policies, upsellMinAvailableRooms: Number(e.target.value)})} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Target Upsell Segment</Label>
                          <Select disabled={!policies.upsellEnabled} value={policies.upsellSegment} onValueChange={(v) => setPolicies({...policies, upsellSegment: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Premium">Premium</SelectItem>
                              <SelectItem value="Executive">Executive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button onClick={() => handleGeneralSave("Front Desk policies and auto-post rules")}>
                    <Save className="h-4 w-4 mr-2" /> Save Global Policies
                  </Button>
                </div>
              </div>
            )}

            {/* 9. INTEGRATION SETTINGS */}
            {activeSection === 9 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Integration Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage connections with Restaurant POS, Phone PBX servers, and Online Travel Agencies (OTAs).</p>
                </div>

                <Tabs defaultValue="pos" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="pos" className="px-4">POS Systems / Outlets</TabsTrigger>
                    <TabsTrigger value="pbx" className="px-4">VoIP PBX / Phone</TabsTrigger>
                    <TabsTrigger value="ota" className="px-4">OTAs / Channel Manager</TabsTrigger>
                  </TabsList>
                  
                  {/* POS outlets tab */}
                  <TabsContent value="pos" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenPOSDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add POS Outlet
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Outlet Name</TableHead>
                            <TableHead>API IP/Endpoint</TableHead>
                            <TableHead>Charge directly to Folio</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {posOutlets.map((pos) => (
                            <TableRow key={pos.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{pos.name}</TableCell>
                              <TableCell className="font-mono text-xs">{pos.apiEndpoint}</TableCell>
                              <TableCell>
                                <Badge variant={pos.autoFolioCharge ? "outline" : "secondary"}>
                                  {pos.autoFolioCharge ? "Allowed" : "Blocked"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={pos.status === "Connected" ? "success" : "secondary"}>{pos.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* PBX tab */}
                  <TabsContent value="pbx" className="space-y-4 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>PBX System / Brand</Label>
                        <Input value={phoneConfig.systemType} onChange={(e) => setPhoneConfig({...phoneConfig, systemType: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>PBX Server Host IP</Label>
                        <Input value={phoneConfig.host} onChange={(e) => setPhoneConfig({...phoneConfig, host: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Asterisk SIP Port</Label>
                        <Input value={phoneConfig.port} onChange={(e) => setPhoneConfig({...phoneConfig, port: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Extension Number Length</Label>
                        <Input type="number" value={phoneConfig.extensionLength} onChange={(e) => setPhoneConfig({...phoneConfig, extensionLength: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2 md:col-span-2 flex items-center justify-between p-3 bg-secondary/10 rounded-lg border">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">Post Telephone Charges directly to Folio</span>
                          <span className="text-xs text-muted-foreground">Charge ${phoneConfig.pricePerMinute}/min for call logs fetched from phone extensions.</span>
                        </div>
                        <Switch checked={phoneConfig.autoChargeFolio} onCheckedChange={(v) => setPhoneConfig({...phoneConfig, autoChargeFolio: v})} />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button onClick={() => handleGeneralSave("PBX Phone integration")}>
                        <Save className="h-4 w-4 mr-2" /> Save PBX Settings
                      </Button>
                    </div>
                  </TabsContent>

                  {/* OTA sync tab */}
                  <TabsContent value="ota" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg border border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary animate-pulse" /> Real-time OTA webhook status is active.</span>
                      <Button size="sm" onClick={handleSyncOTAs} disabled={isSyncingOTAs} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", isSyncingOTAs && "animate-spin")} /> {isSyncingOTAs ? "Syncing..." : "Sync Channels Now"}
                      </Button>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>OTA Name</TableHead>
                            <TableHead>Connection Status</TableHead>
                            <TableHead>Mapped Inventory Rooms</TableHead>
                            <TableHead>Last Synchronized</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {otaIntegrations.map((ota) => (
                            <TableRow key={ota.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{ota.name}</TableCell>
                              <TableCell>
                                <Badge variant={ota.status === "Connected" ? "success" : "secondary"}>{ota.status}</Badge>
                              </TableCell>
                              <TableCell className="font-bold">{ota.activeRooms} rooms</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{ota.lastSync}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* 11. LOYALTY & MEMBERSHIP */}
            {activeSection === 11 && (
              <SetupLoyalty
                loyaltySetup={loyaltySetup}
                setLoyaltySetup={setLoyaltySetup}
                onSave={() => handleGeneralSave("Loyalty Setup")}
              />
            )}

            {/* 12. REVENUE MANAGEMENT */}
            {activeSection === 12 && (
              <SetupRevenue
                revenueConfig={revenueConfig}
                setRevenueConfig={setRevenueConfig}
                onSave={() => handleGeneralSave("Revenue Config")}
              />
            )}

            {/* 13. MULTI-PROPERTY */}
            {activeSection === 13 && (
              <SetupMultiProperty
                multiProperty={multiProperty}
                setMultiProperty={setMultiProperty}
                onSave={() => handleGeneralSave("Multi-Property Config")}
              />
            )}

            {/* 10. TEMPLATES & LANGUAGE */}
            {activeSection === 10 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-gradient-blue">Templates & Document Language</h2>
                  <p className="text-sm text-muted-foreground">Edit HTML templates for guest printouts, mail alerts, and legal contract texts.</p>
                </div>

                <Tabs defaultValue="docs" className="w-full">
                  <TabsList className="bg-secondary/40 p-1 mb-4">
                    <TabsTrigger value="docs" className="px-4">Print Documents</TabsTrigger>
                    <TabsTrigger value="messages" className="px-4">SMS & Emails</TabsTrigger>
                    <TabsTrigger value="legal" className="px-4">Legal Disclaimer</TabsTrigger>
                  </TabsList>
                  
                  {/* Print docs tab */}
                  <TabsContent value="docs" className="space-y-4 focus-visible:outline-none">
                    <div className="flex gap-2 mb-2">
                      <Button size="sm" variant={selectedDocTemplate === "reg_card" ? "secondary" : "outline"} onClick={() => setSelectedDocTemplate("reg_card")}>Registration Card</Button>
                      <Button size="sm" variant={selectedDocTemplate === "invoice" ? "secondary" : "outline"} onClick={() => setSelectedDocTemplate("invoice")}>Guest Invoice</Button>
                      <Button size="sm" variant={selectedDocTemplate === "confirm" ? "secondary" : "outline"} onClick={() => setSelectedDocTemplate("confirm")}>Confirmation Letter</Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold text-xs">HTML Editor Source Code</Label>
                        <Textarea 
                          className="font-mono text-xs h-[300px] bg-secondary/15" 
                          value={docTemplates[selectedDocTemplate]} 
                          onChange={(e) => setDocTemplates({...docTemplates, [selectedDocTemplate]: e.target.value})}
                        />
                        <div className="flex justify-end pt-2">
                          <Button size="sm" onClick={() => handleGeneralSave("Document Template")}>
                            <Save className="h-4 w-4 mr-2" /> Save HTML
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 flex flex-col">
                        <Label className="font-semibold text-xs">Live Parsed Print Preview</Label>
                        <div 
                          className="border rounded-lg p-4 bg-white text-black h-[300px] overflow-y-auto shadow-sm select-none"
                          dangerouslySetInnerHTML={{
                            __html: docTemplates[selectedDocTemplate]
                              .replace("{{guest_name}}", "Jane Doe")
                              .replace("{{room_number}}", "201")
                              .replace("{{check_in_date}}", "2026-05-20")
                              .replace("{{check_out_date}}", "2026-05-25")
                              .replace("{{rate_plan}}", "Standard Flexible Rate")
                              .replace("{{invoice_number}}", "INV-2026-0043")
                              .replace("{{invoice_date}}", "2026-05-19")
                              .replace("{{subtotal}}", "Rs. 15,000")
                              .replace("{{taxes}}", "Rs. 3,450")
                              .replace("{{total}}", "Rs. 18,450")
                              .replace("{{confirmation_code}}", "LX-8941A")
                          }}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Messages tab */}
                  <TabsContent value="messages" className="space-y-4 focus-visible:outline-none">
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleOpenMsgTemplateDialog(false)} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Message Template
                      </Button>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Template Name</TableHead>
                            <TableHead>Notification Channel</TableHead>
                            <TableHead>Subject Title</TableHead>
                            <TableHead>Short Body Summary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {messageTemplates.map((mt) => (
                            <TableRow key={mt.id} className="hover:bg-secondary/20">
                              <TableCell className="font-semibold text-foreground">{mt.name}</TableCell>
                              <TableCell>
                                <Badge variant={mt.type === "Email" ? "outline" : "secondary"}>
                                  {mt.type === "Email" ? <Mail className="h-3 w-3 mr-1 text-primary inline" /> : <MessageSquare className="h-3 w-3 mr-1 text-success inline" />}
                                  {mt.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="truncate max-w-[150px]">{mt.subject || "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-sm">{mt.body}</TableCell>
                              <TableCell className="text-right space-x-1 whitespace-nowrap">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenMsgTemplateDialog(true, mt)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Dispatch Test Send" onClick={() => setTestSendModal({ open: true, target: "", templateId: mt.id })}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Legal disclaimers tab */}
                  <TabsContent value="legal" className="space-y-4 focus-visible:outline-none">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Check-in Registration Waiver / Liability Texts</Label>
                        <Textarea 
                          value={legalTexts.waiver} 
                          onChange={(e) => setLegalTexts({...legalTexts, waiver: e.target.value})} 
                          rows={3} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>General Hotel Terms & Policies Disclaimer</Label>
                        <Textarea 
                          value={legalTexts.terms} 
                          onChange={(e) => setLegalTexts({...legalTexts, terms: e.target.value})} 
                          rows={3} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Privacy Notice & Data GDPR Declaration</Label>
                        <Textarea 
                          value={legalTexts.privacy} 
                          onChange={(e) => setLegalTexts({...legalTexts, privacy: e.target.value})} 
                          rows={3} 
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end">
                      <Button onClick={() => handleGeneralSave("Legal Agreements disclaimers")}>
                        <Save className="h-4 w-4 mr-2" /> Save Terms
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

          </div>
        </Card>
      </div>

      {/* --- ALL SETUP SCREEN MODALS (DIALOGS) FOR CRUD SIMULATIONS --- */}

      {/* 2. Room Type Dialog */}
      <Dialog open={roomTypeModal.open} onOpenChange={(v) => setRoomTypeModal({...roomTypeModal, open: v})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{roomTypeModal.isEdit ? "Edit Room Type" : "Add Room Type"}</DialogTitle>
            <DialogDescription>Input room classification details here. Click Save when finished.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input 
                value={roomTypeModal.data.name} 
                onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, name: e.target.value}})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Code</Label>
                <Input 
                  value={roomTypeModal.data.code} 
                  onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, code: e.target.value}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price Per Night</Label>
                <Input 
                  type="number" 
                  value={roomTypeModal.data.basePrice} 
                  onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, basePrice: Number(e.target.value)}})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Std Occupancy</Label>
                <Input 
                  type="number" 
                  value={roomTypeModal.data.occupancy} 
                  onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, occupancy: Number(e.target.value)}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Max Occupancy</Label>
                <Input 
                  type="number" 
                  value={roomTypeModal.data.maxOccupancy} 
                  onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, maxOccupancy: Number(e.target.value)}})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Classification Status</Label>
              <Select 
                value={roomTypeModal.data.status} 
                onValueChange={(val) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, status: val}})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest Segment</Label>
                <Select 
                  value={roomTypeModal.data.segment || "Standard"} 
                  onValueChange={(val) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, segment: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Blocking Rule</Label>
                <Select 
                  value={roomTypeModal.data.blockingRule || "none"} 
                  onValueChange={(val) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, blockingRule: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="vip_only">VIP Only</SelectItem>
                    <SelectItem value="manager_approval">Manager Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Internal Notes / Description</Label>
              <Textarea 
                value={roomTypeModal.data.notes || ""} 
                onChange={(e) => setRoomTypeModal({...roomTypeModal, data: {...roomTypeModal.data, notes: e.target.value}})} 
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomTypeModal({...roomTypeModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveRoomType}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Room Inventory Dialog */}
      <Dialog open={roomModal.open} onOpenChange={(v) => setRoomModal({...roomModal, open: v})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{roomModal.isEdit ? "Edit Room" : "Add Room"}</DialogTitle>
            <DialogDescription>Modify physical room parameters.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input 
                  value={roomModal.data.roomNumber} 
                  onChange={(e) => setRoomModal({...roomModal, data: {...roomModal.data, roomNumber: e.target.value}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Floor Level</Label>
                <Input 
                  type="number" 
                  value={roomModal.data.floor} 
                  onChange={(e) => setRoomModal({...roomModal, data: {...roomModal.data, floor: Number(e.target.value)}})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Room Type Class</Label>
              <Select 
                value={roomModal.data.type} 
                onValueChange={(val) => setRoomModal({...roomModal, data: {...roomModal.data, type: val}})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roomTypes.map(rt => (
                    <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Standard Capacity</Label>
                <Input 
                  type="number" 
                  value={roomModal.data.capacity} 
                  onChange={(e) => setRoomModal({...roomModal, data: {...roomModal.data, capacity: Number(e.target.value)}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Initial Status</Label>
                <Select 
                  value={roomModal.data.status} 
                  onValueChange={(val) => setRoomModal({...roomModal, data: {...roomModal.data, status: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="cleaning">Cleaning</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomModal({...roomModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveRoom}>Save Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4.1 Rate Plan Dialog */}
      <Dialog open={ratePlanModal.open} onOpenChange={(v) => setRatePlanModal({...ratePlanModal, open: v})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{ratePlanModal.isEdit ? "Edit Rate Plan" : "Add Rate Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Rate Strategy Name</Label>
              <Input 
                value={ratePlanModal.data.name} 
                onChange={(e) => setRatePlanModal({...ratePlanModal, data: {...ratePlanModal.data, name: e.target.value}})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate Code</Label>
                <Input 
                  value={ratePlanModal.data.code} 
                  onChange={(e) => setRatePlanModal({...ratePlanModal, data: {...ratePlanModal.data, code: e.target.value}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Modifier Value</Label>
                <Input 
                  type="number" 
                  value={ratePlanModal.data.discountValue || 0} 
                  onChange={(e) => setRatePlanModal({...ratePlanModal, data: {...ratePlanModal.data, discountValue: Number(e.target.value)}})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modifier Type</Label>
                <Select 
                  value={ratePlanModal.data.discountType || "percentage"} 
                  onValueChange={(val) => setRatePlanModal({...ratePlanModal, data: {...ratePlanModal.data, discountType: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Discount</SelectItem>
                    <SelectItem value="fixed">Fixed Price Reduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Status</Label>
                <Select 
                  value={ratePlanModal.data.status || "Active"} 
                  onValueChange={(val) => setRatePlanModal({...ratePlanModal, data: {...ratePlanModal.data, status: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatePlanModal({...ratePlanModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveRatePlan}>Save Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4.2 Package Dialog */}
      <Dialog open={packageModal.open} onOpenChange={(v) => setPackageModal({...packageModal, open: v})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{packageModal.isEdit ? "Edit Package Bundle" : "Create Package Bundle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Package Name</Label>
              <Input 
                value={packageModal.data.name} 
                onChange={(e) => setPackageModal({...packageModal, data: {...packageModal.data, name: e.target.value}})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bundle Cost Add-on</Label>
                <Input 
                  type="number" 
                  value={packageModal.data.totalCost} 
                  onChange={(e) => setPackageModal({...packageModal, data: {...packageModal.data, totalCost: Number(e.target.value)}})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={packageModal.data.status} 
                  onValueChange={(val) => setPackageModal({...packageModal, data: {...packageModal.data, status: val}})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 border p-3 rounded-lg bg-secondary/10">
              <Label className="text-xs font-bold block mb-1.5">Package Components List</Label>
              <div className="space-y-1 max-h-[100px] overflow-y-auto mb-2">
                {packageModal.data.components?.map((comp: string, idx: number) => (
                  <div key={idx} className="flex justify-between items-center bg-background px-2 py-1 rounded text-xs border border-border/50">
                    <span>{comp}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveComponentFromPackage(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Add item e.g. Breakfast" 
                  value={newComponentText} 
                  onChange={(e) => setNewComponentText(e.target.value)} 
                  className="h-8 text-xs" 
                />
                <Button size="sm" variant="outline" onClick={handleAddComponentToPackage} className="h-8">Add Component</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPackageModal({...packageModal, open: false})}>Cancel</Button>
            <Button onClick={handleSavePackage}>Save Package</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5.1 Tax Group Dialog */}
      <Dialog open={taxModal.open} onOpenChange={(v) => setTaxModal({...taxModal, open: v})}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tax Rate Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tax Bracket Name</Label>
              <Input value={taxModal.data.name} onChange={(e) => setTaxModal({...taxModal, data: {...taxModal.data, name: e.target.value}})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rate %</Label>
                <Input type="number" step="0.1" value={taxModal.data.rate} onChange={(e) => setTaxModal({...taxModal, data: {...taxModal.data, rate: Number(e.target.value)}})} />
              </div>
              <div className="space-y-2">
                <Label>Tax Classification</Label>
                <Select value={taxModal.data.type} onValueChange={(v) => setTaxModal({...taxModal, data: {...taxModal.data, type: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                    <SelectItem value="Service Charge">Service Charge</SelectItem>
                    <SelectItem value="Flat Levy">Flat Levy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaxModal({...taxModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveTax}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5.2 Charge Type Dialog */}
      <Dialog open={chargeModal.open} onOpenChange={(v) => setChargeModal({...chargeModal, open: v})}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Charge Item Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input value={chargeModal.data.name} onChange={(e) => setChargeModal({...chargeModal, data: {...chargeModal.data, name: e.target.value}})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Cost Price</Label>
                <Input type="number" value={chargeModal.data.amount} onChange={(e) => setChargeModal({...chargeModal, data: {...chargeModal.data, amount: Number(e.target.value)}})} />
              </div>
              <div className="space-y-2">
                <Label>Service Category</Label>
                <Select value={chargeModal.data.category} onValueChange={(v) => setChargeModal({...chargeModal, data: {...chargeModal.data, category: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Accommodation">Accommodation</SelectItem>
                    <SelectItem value="F&B">F&B Outlets</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Spa & Gym">Spa & Gym</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Applied Tax Group</Label>
              <Select value={chargeModal.data.taxGroup} onValueChange={(v) => setChargeModal({...chargeModal, data: {...chargeModal.data, taxGroup: v}})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {taxGroups.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeModal({...chargeModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveCharge}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7.1 User Account Dialog */}
      <Dialog open={userModal.open} onOpenChange={(v) => setUserModal({...userModal, open: v})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{userModal.isEdit ? "Modify User Account" : "Register New System Operator"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={userModal.data.name} onChange={(e) => setUserModal({...userModal, data: {...userModal.data, name: e.target.value}})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={userModal.data.username} onChange={(e) => setUserModal({...userModal, data: {...userModal.data, username: e.target.value}})} />
              </div>
              <div className="space-y-2">
                <Label>Operator Email</Label>
                <Input value={userModal.data.email} onChange={(e) => setUserModal({...userModal, data: {...userModal.data, email: e.target.value}})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Role</Label>
                <Select value={userModal.data.role} onValueChange={(v) => setUserModal({...userModal, data: {...userModal.data, role: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default PC Workstation</Label>
                <Input value={userModal.data.workstation} onChange={(e) => setUserModal({...userModal, data: {...userModal.data, workstation: e.target.value}})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Status</Label>
              <Select value={userModal.data.status} onValueChange={(v) => setUserModal({...userModal, data: {...userModal.data, status: v}})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserModal({...userModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveUser}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7.2 Custom Role Dialog */}
      <Dialog open={roleModal.open} onOpenChange={(v) => setRoleModal({...roleModal, open: v})}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Define Operator Role Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input value={roleModal.data.name} onChange={(e) => setRoleModal({...roleModal, data: {...roleModal.data, name: e.target.value}})} />
            </div>
            <div className="space-y-2">
              <Label>Role System Code</Label>
              <Input value={roleModal.data.code} placeholder="e.g. AUDIT" onChange={(e) => setRoleModal({...roleModal, data: {...roleModal.data, code: e.target.value.toUpperCase()}})} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={roleModal.data.description} onChange={(e) => setRoleModal({...roleModal, data: {...roleModal.data, description: e.target.value}})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModal({...roleModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9.1 POS Outlet Dialog */}
      <Dialog open={posModal.open} onOpenChange={(v) => setPosModal({...posModal, open: v})}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>POS Outlet Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Outlet Name</Label>
              <Input value={posModal.data.name} onChange={(e) => setPosModal({...posModal, data: {...posModal.data, name: e.target.value}})} />
            </div>
            <div className="space-y-2">
              <Label>API Host Port Endpoint</Label>
              <Input value={posModal.data.apiEndpoint} placeholder="e.g. 192.168.1.100/api/pos" onChange={(e) => setPosModal({...posModal, data: {...posModal.data, apiEndpoint: e.target.value}})} />
            </div>
            <div className="space-y-2 flex items-center justify-between p-3 bg-secondary/10 rounded-lg border">
              <div className="flex flex-col">
                <span className="text-xs font-bold">Auto-post bills directly to folio</span>
                <span className="text-[10px] text-muted-foreground">Allows waiters to post food bills to hotel room numbers.</span>
              </div>
              <Switch checked={posModal.data.autoFolioCharge} onCheckedChange={(v) => setPosModal({...posModal, data: {...posModal.data, autoFolioCharge: v}})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosModal({...posModal, open: false})}>Cancel</Button>
            <Button onClick={handleSavePOS}>Connect POS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10.2 Message Template Dialog */}
      <Dialog open={msgTemplateModal.open} onOpenChange={(v) => setMsgTemplateModal({...msgTemplateModal, open: v})}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Message Template Editor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={msgTemplateModal.data.name} onChange={(e) => setMsgTemplateModal({...msgTemplateModal, data: {...msgTemplateModal.data, name: e.target.value}})} />
              </div>
              <div className="space-y-2">
                <Label>Notification Channel</Label>
                <Select value={msgTemplateModal.data.type} onValueChange={(v) => setMsgTemplateModal({...msgTemplateModal, data: {...msgTemplateModal.data, type: v}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Email">Email Delivery</SelectItem>
                    <SelectItem value="SMS">SMS Gateway</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {msgTemplateModal.data.type === "Email" && (
              <div className="space-y-2">
                <Label>Email Subject Line</Label>
                <Input value={msgTemplateModal.data.subject} onChange={(e) => setMsgTemplateModal({...msgTemplateModal, data: {...msgTemplateModal.data, subject: e.target.value}})} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Template Body Text</Label>
              <Textarea value={msgTemplateModal.data.body} rows={4} onChange={(e) => setMsgTemplateModal({...msgTemplateModal, data: {...msgTemplateModal.data, body: e.target.value}})} />
              <span className="text-[10px] text-muted-foreground block mt-1">Available variables: {"{{guest_name}}"}, {"{{room_number}}"}, {"{{check_in_date}}"}, {"{{reservation_id}}"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsgTemplateModal({...msgTemplateModal, open: false})}>Cancel</Button>
            <Button onClick={handleSaveMsgTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 10.2 Message Template Test Send Dialog */}
      <Dialog open={testSendModal.open} onOpenChange={(v) => setTestSendModal({...testSendModal, open: v})}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Send Test Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Enter Destination address (Email or Mobile #)</Label>
              <Input 
                value={testSendModal.target} 
                placeholder="e.g. test@example.com or +977-9801..."
                onChange={(e) => setTestSendModal({...testSendModal, target: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestSendModal({...testSendModal, open: false})}>Cancel</Button>
            <Button onClick={handleTestSend}>Dispatch Test</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
