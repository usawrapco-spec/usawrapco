'use client'

import { useState } from 'react'
import { VehicleSurvey, type SurveyVehicle } from '@/components/projects/VehicleSurvey'
import { LineItemsList } from '@/components/projects/LineItemEditor'

interface SurveyBuilderProps {
  projectId: string
  initialSurveyVehicles?: SurveyVehicle[]
}

export default function SurveyBuilder({ projectId, initialSurveyVehicles = [] }: SurveyBuilderProps) {
  const [surveyVehicles, setSurveyVehicles] = useState<SurveyVehicle[]>(initialSurveyVehicles)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <VehicleSurvey
        projectId={projectId}
        onVehiclesChange={setSurveyVehicles}
        initialVehicles={initialSurveyVehicles}
      />

      <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 20 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text1)',
          marginBottom: 14,
          fontFamily: "'Barlow Condensed', sans-serif",
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Line Items
        </div>
        <LineItemsList
          projectId={projectId}
          targetGpm={75}
          surveyVehicles={surveyVehicles}
        />
      </div>
    </div>
  )
}
