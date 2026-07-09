create or replace view v_inventory_health as
select
  p.product_id,
  p.sku,
  p.product_name,
  p.category,
  ip.location_type,
  ip.location_id,
  case
    when ip.location_type = 'STORE' then s.store_code
    else w.warehouse_code
  end as location_code,
  case
    when ip.location_type = 'STORE' then s.store_name
    else w.warehouse_name
  end as location_name,
  case
    when ip.location_type = 'STORE' then s.region_name
    else w.region_name
  end as region_name,
  ip.on_hand,
  ip.reserved_qty,
  ip.reorder_point,
  ip.reorder_qty,
  ip.safety_stock,
  case
    when ip.on_hand <= ip.safety_stock then 'CRITICAL'
    when ip.on_hand <= ip.reorder_point then 'LOW'
    when ip.on_hand >= ip.reorder_point + ip.reorder_qty then 'OVERSTOCK'
    else 'HEALTHY'
  end as stock_status,
  ip.last_updated
from inventory_positions ip
join retail_products p on p.product_id = ip.product_id
left join retail_stores s on ip.location_type = 'STORE' and s.store_id = ip.location_id
left join retail_warehouses w on ip.location_type = 'WAREHOUSE' and w.warehouse_id = ip.location_id;
