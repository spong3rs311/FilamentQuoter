export function calculateQuote(volumeCm3, filament, pricing) {
  const weight_g = volumeCm3 * filament.density_g_per_cm3 * (1 + pricing.waste_factor)
  const material_cost = weight_g * filament.cost_per_gram
  const print_hours = volumeCm3 / filament.print_speed_cm3_per_hr
  const machine_cost = print_hours * pricing.machine_hourly_rate
  const labor_fee = pricing.labor_fee
  const subtotal = material_cost + machine_cost + labor_fee
  const computed_total = subtotal * (1 + pricing.markup_percent / 100)
  const markup_amount = computed_total - subtotal
  const minimum_applied = computed_total < pricing.minimum_order_total
  const final_total = minimum_applied ? pricing.minimum_order_total : computed_total
  return { weight_g, material_cost, print_hours, machine_cost, labor_fee,
           markup_amount, subtotal, computed_total, final_total, minimum_applied }
}
