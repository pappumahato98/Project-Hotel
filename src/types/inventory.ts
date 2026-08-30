export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sku_prefix: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  supplier_code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string | null;
  rating: number | null;
  is_approved: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface InventoryUoM {
  id: string;
  name: string;
  abbreviation: string | null;
  created_at: string;
}

export interface InventoryUoMConversion {
  id: string;
  from_uom_id: string;
  to_uom_id: string;
  conversion_factor: number;
  notes: string | null;
  created_at: string;
  from_uom?: InventoryUoM;
  to_uom?: InventoryUoM;
}

export interface InventoryStore {
  id: string;
  code: string;
  name: string;
  location: string | null;
  store_manager_id: string | null;
  store_type: string;
  is_active: boolean;
  temperature_classification: string | null;
  storage_conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  supplier_id: string | null;
  uom_id: string | null;
  unit: string;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  reorder_point: number;
  safety_stock: number;
  cost_price: number;
  avg_cost: number;
  last_purchase_cost: number;
  selling_price: number | null;
  location: string | null;
  department: string | null;
  item_type: string;
  shelf_life: string | null;
  storage_instructions: string | null;
  tax_applicability: string[];
  image_url: string | null;
  attributes: Record<string, string>;
  is_active: boolean;
  last_restocked_at: string | null;
  created_at: string;
  category?: InventoryCategory;
  supplier?: Supplier;
  uom?: InventoryUoM;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string | null;
  status: string;
  order_date: string;
  expected_delivery: string | null;
  received_date: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  received_quantity: number;
  batch_number?: string;
  expiry_date?: string;
  damaged_quantity?: number;
  quality_status?: string;
  item?: InventoryItem;
}

export interface StockMovement {
  id: string;
  item_id: string;
  store_id: string | null;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  created_at: string;
  item?: InventoryItem;
}

export interface InventoryTransfer {
  id: string;
  transfer_number: string;
  item_id: string;
  quantity: number;
  from_store_id: string | null;
  to_store_id: string | null;
  transferred_by: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  item?: { name: string; sku: string | null; unit: string };
  from_store?: InventoryStore;
  to_store?: InventoryStore;
}

export interface InventoryWastage {
  id: string;
  item_id: string;
  quantity: number;
  wastage_type: string;
  reason: string | null;
  reported_by: string | null;
  approved_by: string | null;
  cost_impact: number;
  status: string;
  created_at: string;
  item?: { name: string; sku: string | null; unit: string; cost_price: number };
}

export interface InventoryRequisitionItem {
  id: string;
  requisition_id: string;
  item_id: string;
  quantity: number;
  item?: InventoryItem;
}

export interface InventoryRequisition {
  id: string;
  requisition_number: string;
  department: string;
  requested_by: string;
  required_date: string | null;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  items?: InventoryRequisitionItem[];
}

export interface InventoryRecipeItem {
  id: string;
  recipe_id: string;
  item_id: string;
  quantity: number;
  uom_id: string | null;
  item?: InventoryItem;
  uom?: InventoryUoM;
}

export interface InventoryRecipe {
  id: string;
  name: string;
  menu_item_id: string | null;
  description: string | null;
  portion_size: string | null;
  yield_percentage: number;
  is_active: boolean;
  created_at: string;
  items?: InventoryRecipeItem[];
}

export interface InventoryStockIssueItem {
  id: string;
  stock_issue_id: string;
  item_id: string;
  quantity: number;
  batch_number?: string;
  item?: InventoryItem;
}

export interface InventoryStockIssue {
  id: string;
  requisition_id: string | null;
  issue_number: string;
  department: string;
  issued_to: string | null;
  issued_by: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  items?: InventoryStockIssueItem[];
}

export interface InventoryStockCount {
  id: string;
  count_number: string;
  store_id: string | null;
  counted_by: string | null;
  count_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  store?: InventoryStore;
  items?: InventoryStockCountItem[];
}

export interface InventoryStockCountItem {
  id: string;
  stock_count_id: string;
  item_id: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number;
  notes: string | null;
  item?: InventoryItem;
}

export interface InventorySupplierReturn {
  id: string;
  return_number: string;
  supplier_id: string | null;
  purchase_order_id: string | null;
  reason: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  supplier?: Supplier;
  items?: InventorySupplierReturnItem[];
}

export interface InventorySupplierReturnItem {
  id: string;
  supplier_return_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  item?: InventoryItem;
}

export interface SupplierContract {
  id: string;
  supplier_id: string;
  contract_number: string;
  valid_from: string;
  valid_to: string;
  terms: string | null;
  status: string;
}

export interface SupplierPricing {
  id: string;
  supplier_id: string;
  item_id: string;
  contract_id: string | null;
  unit_price: number;
  currency: string;
  is_preferred: boolean;
}
