import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { VehicleMeasurements, VehiclePanelSelection } from '@/components/shared/VehicleSelectorFull'

export function useVehicleMakes() {
  const [makes, setMakes] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('vehicle_measurements').select('make').order('make')
      .then(({ data }) => {
        if (data) setMakes([...new Set(data.map((d: { make: string }) => d.make))].sort())
      })
  }, [])

  return makes
}

export function useVehicleModels(make: string) {
  const [models, setModels] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!make) { setModels([]); return }
    supabase.from('vehicle_measurements').select('model').eq('make', make).order('model')
      .then(({ data }) => {
        if (data) setModels([...new Set(data.map((d: { model: string }) => d.model))].sort())
      })
  }, [make])

  return models
}

export function useVehicleYears(make: string, model: string) {
  const [years, setYears] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!make || !model) { setYears([]); return }
    supabase.from('vehicle_measurements').select('year_range, year_start')
      .eq('make', make).eq('model', model).order('year_start')
      .then(({ data }) => {
        if (data) setYears(data.map((d: { year_range: string }) => d.year_range))
      })
  }, [make, model])

  return years
}

export function useVehicleLookup(make: string, model: string, yearRange: string) {
  const [vehicle, setVehicle] = useState<VehicleMeasurements | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!make || !model || !yearRange) { setVehicle(null); return }
    setLoading(true)
    supabase.from('vehicle_measurements').select('*')
      .eq('make', make).eq('model', model).eq('year_range', yearRange)
      .single()
      .then(({ data }) => {
        setLoading(false)
        setVehicle(data as VehicleMeasurements | null)
      })
  }, [make, model, yearRange])

  return { vehicle, loading }
}

export function useVehicleSearch(query: string) {
  const [results, setResults] = useState<VehicleMeasurements[]>([])
  const supabase = createClient()

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    const { data } = await supabase.from('vehicle_measurements').select('*')
      .or(`make.ilike.%${q}%,model.ilike.%${q}%`).order('make').limit(15)
    if (data) setResults(data as VehicleMeasurements[])
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, doSearch])

  return results
}

export function calculateSelectedSqft(
  vehicle: VehicleMeasurements | null,
  panels: Partial<VehiclePanelSelection>
): { total: number; breakdown: Record<string, number> } {
  if (!vehicle) return { total: 0, breakdown: {} }

  const breakdown: Record<string, number> = {}
  let total = 0

  if (panels.driverSide !== false && vehicle.driver_side_sqft) {
    breakdown.driverSide = vehicle.driver_side_sqft; total += vehicle.driver_side_sqft
  }
  if (panels.passengerSide !== false && vehicle.passenger_side_sqft) {
    breakdown.passengerSide = vehicle.passenger_side_sqft; total += vehicle.passenger_side_sqft
  }
  if (panels.rear !== false && vehicle.rear_sqft) {
    breakdown.rear = vehicle.rear_sqft; total += vehicle.rear_sqft
  }
  if (panels.hood !== false && vehicle.hood_sqft) {
    breakdown.hood = vehicle.hood_sqft; total += vehicle.hood_sqft
  }
  if (panels.roof !== false && vehicle.roof_sqft) {
    breakdown.roof = vehicle.roof_sqft; total += vehicle.roof_sqft
  }

  return { total: Math.round(total * 10) / 10, breakdown }
}
