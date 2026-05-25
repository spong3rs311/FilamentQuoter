import { describe, it, expect } from 'vitest'
import { calculateQuote } from '../src/calculator.js'

const pricing = {
  machine_hourly_rate: 2.50,
  labor_fee: 15.00,
  markup_percent: 30,
  waste_factor: 0.15,
  minimum_order_total: 19.00
}

const pla = {
  density_g_per_cm3: 1.24,
  cost_per_gram: 0.02,
  print_speed_cm3_per_hr: 10.0
}

describe('calculateQuote', () => {
  it('calculates weight with waste factor', () => {
    expect(calculateQuote(10, pla, pricing).weight_g).toBeCloseTo(14.26, 2)
  })
  it('calculates material cost', () => {
    expect(calculateQuote(10, pla, pricing).material_cost).toBeCloseTo(0.2852, 4)
  })
  it('calculates print hours', () => {
    expect(calculateQuote(10, pla, pricing).print_hours).toBeCloseTo(1.0, 4)
  })
  it('calculates machine cost', () => {
    expect(calculateQuote(10, pla, pricing).machine_cost).toBeCloseTo(2.50, 4)
  })
  it('applies markup to subtotal', () => {
    expect(calculateQuote(10, pla, pricing).computed_total).toBeCloseTo(23.12, 1)
  })
  it('enforces minimum order when computed total is below threshold', () => {
    const minPricing = { machine_hourly_rate: 0.50, labor_fee: 0, markup_percent: 0, waste_factor: 0.15, minimum_order_total: 25.00 }
    const r = calculateQuote(0.01, pla, minPricing)
    expect(r.minimum_applied).toBe(true)
    expect(r.final_total).toBe(25.00)
  })
  it('does not enforce minimum when total exceeds it', () => {
    const r = calculateQuote(10, pla, pricing)
    expect(r.final_total).toBeCloseTo(23.12, 1)
    expect(r.minimum_applied).toBe(false)
  })
  it('returns all expected fields', () => {
    const r = calculateQuote(10, pla, pricing)
    for (const key of ['weight_g','material_cost','print_hours','machine_cost',
                        'labor_fee','markup_amount','subtotal','computed_total',
                        'final_total','minimum_applied']) {
      expect(r).toHaveProperty(key)
    }
  })
})
