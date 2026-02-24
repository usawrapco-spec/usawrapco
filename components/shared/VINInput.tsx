'use client'

import { useState, useEffect } from 'react'
import { Search, AlertCircle, CheckCircle, Camera } from 'lucide-react'

interface VINInputProps {
  value: string
  onChange: (vin: string) => void
  onVehicleData?: (data: VehicleData) => void
  showScanner?: boolean
}

interface VehicleData {
  vin: string
  year: string | null
  make: string | null
  model: string | null
  trim: string | null
  bodyClass: string | null
  vehicleType: string | null
  driveType: string | null
  engineCylinders: string | null
  engineLiters: string | null
  fuelType: string | null
  doors: string | null
}

export default function VINInput({ value, onChange, onVehicleData, showScanner = false }: VINInputProps) {
  const [vin, setVin] = useState(value)
  const [loading, setLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState<VehicleData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  useEffect(() => {
    setVin(value)
  }, [value])

  useEffect(() => {
    // Auto-lookup when VIN reaches 17 characters
    if (vin.length === 17) {
      handleLookup()
    } else {
      setVehicleData(null)
      setError(null)
    }
  }, [vin])

  const handleLookup = async () => {
    if (vin.length !== 17) {
      setError('VIN must be exactly 17 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/vin/lookup?vin=${encodeURIComponent(vin)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lookup VIN')
      }

      setVehicleData(data.vehicle)
      if (onVehicleData) {
        onVehicleData(data.vehicle)
      }
    } catch (err: any) {
      setError(err.message)
      setVehicleData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVin = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17)
    setVin(newVin)
    onChange(newVin)
  }

  const handleScan = async () => {
    // Use native file input to access camera on mobile devices
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' as any // Use rear camera on mobile

    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0]
      if (!file) return

      // For now, just notify user that OCR is not implemented
      // In future, could send to OCR API to extract VIN from image
      alert('VIN photo captured. OCR extraction will be added in a future update. Please enter VIN manually for now.')

      // Future: Send image to OCR service
      // const formData = new FormData()
      // formData.append('image', file)
      // const response = await fetch('/api/ocr/vin', { method: 'POST', body: formData })
      // const { vin } = await response.json()
      // if (vin) {
      //   setVin(vin)
      //   onChange(vin)
      // }
    }

    input.click()
  }

  return (
    <div>
      {/* VIN Input Field */}
      <div className="mb-3">
        <label className="block text-xs font-700 text-text2 mb-1.5 uppercase tracking-wide">
          VIN (17 characters)
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={vin}
              onChange={handleChange}
              placeholder="Enter 17-character VIN"
              maxLength={17}
              className="field w-full font-mono text-sm tracking-wider"
              style={{ paddingRight: loading ? 40 : 12 }}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          {showScanner && (
            <button
              type="button"
              onClick={handleScan}
              className="btn-secondary text-sm shrink-0"
              title="Scan VIN barcode"
            >
              <Camera size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-text3 mt-1">
          Find VIN on driver door jamb sticker or windshield base
        </p>
      </div>

      {/* Vehicle Data Card */}
      {vehicleData && !error && (
        <div className="p-4 rounded-lg border border-green/30 bg-green/5 mb-3">
          <div className="flex items-start gap-2 mb-2">
            <CheckCircle size={16} className="text-green mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-700 text-green mb-1">Vehicle Found</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {vehicleData.year && (
                  <div>
                    <span className="text-text3">Year:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.year}</span>
                  </div>
                )}
                {vehicleData.make && (
                  <div>
                    <span className="text-text3">Make:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.make}</span>
                  </div>
                )}
                {vehicleData.model && (
                  <div>
                    <span className="text-text3">Model:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.model}</span>
                  </div>
                )}
                {vehicleData.trim && (
                  <div>
                    <span className="text-text3">Trim:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.trim}</span>
                  </div>
                )}
                {vehicleData.bodyClass && (
                  <div>
                    <span className="text-text3">Body:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.bodyClass}</span>
                  </div>
                )}
                {vehicleData.engineCylinders && (
                  <div>
                    <span className="text-text3">Engine:</span>{' '}
                    <span className="text-text1 font-600">
                      {vehicleData.engineCylinders} cyl
                      {vehicleData.engineLiters && ` (${vehicleData.engineLiters}L)`}
                    </span>
                  </div>
                )}
                {vehicleData.driveType && (
                  <div>
                    <span className="text-text3">Drive:</span>{' '}
                    <span className="text-text1 font-600">{vehicleData.driveType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg border border-red/30 bg-red/5 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red shrink-0" />
            <div className="text-xs text-red">{error}</div>
          </div>
        </div>
      )}

      {/* Manual Entry Link */}
      {!showManualEntry && (
        <button
          type="button"
          onClick={() => setShowManualEntry(true)}
          className="text-xs text-accent hover:underline"
        >
          Enter vehicle details manually instead
        </button>
      )}
    </div>
  )
}
