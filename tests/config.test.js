import { describe, it, expect } from 'vitest'
import config from '../public/config.json'

describe('config.json', () => {
  it('has all required pricing fields', () => {
    const p = config.pricing
    expect(p.machine_hourly_rate).toBeGreaterThan(0)
    expect(p.labor_fee).toBeGreaterThan(0)
    expect(p.markup_percent).toBeGreaterThan(0)
    expect(p.waste_factor).toBeGreaterThan(0)
    expect(p.minimum_order_total).toBe(19.00)
  })

  it('has 6 filaments', () => {
    expect(config.filaments).toHaveLength(6)
  })

  it('each filament has all required fields with positive values', () => {
    for (const f of config.filaments) {
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.description).toBeTruthy()
      expect(f.density_g_per_cm3).toBeGreaterThan(0)
      expect(f.cost_per_gram).toBeGreaterThan(0)
      expect(f.print_speed_cm3_per_hr).toBeGreaterThan(0)
    }
  })
})
