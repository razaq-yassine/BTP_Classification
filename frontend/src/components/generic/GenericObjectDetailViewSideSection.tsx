import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Construction } from 'lucide-react'
import { AttachmentsSection } from './AttachmentsSection'
import { RecordHistorySection } from './RecordHistorySection'
import { usePermissions } from '@/hooks/usePermissions'
import { DossierResumeBanner } from '@/components/dossier/DossierResumeBanner'

interface GenericObjectDetailViewSideSectionProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  /** When provided and object is dossier, enables the resume banner and passes this callback */
  onOpenDossierWizard?: () => void
}

// Component for tab content that is under development
function UnderDevelopmentTabContent({ name, underDevelopmentText }: { name: string; underDevelopmentText: string }) {
  return (
    <div className="flex items-center justify-center py-4 text-muted-foreground">
      <div className="text-center">
        <Construction className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{name} - {underDevelopmentText}</p>
      </div>
    </div>
  );
}

export function GenericObjectDetailViewSideSection({
  objectDefinition,
  record,
  onOpenDossierWizard,
}: GenericObjectDetailViewSideSectionProps) {
  const { t } = useTranslation('common')
  const [activeTab, setActiveTab] = useState('history');
  const { canUpdate } = usePermissions();
  const recordId = record?.id != null ? Number(record.id) : null;

  return (
    <div className="space-y-4">
      {/* Dossier resume banner - at the very top of the detail view side section */}
      {onOpenDossierWizard && (
        <DossierResumeBanner
          objectDefinition={objectDefinition}
          record={record}
          onResumeClick={onOpenDossierWizard}
        />
      )}
      <Card className="py-1">
        <CardContent className="p-0">
          <Tabs defaultValue="history" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="history" className="flex-1">{t('history')}</TabsTrigger>
              <TabsTrigger value="files" className="flex-1">{t('files')}</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="p-3 mt-0">
              {recordId != null ? (
                <RecordHistorySection
                  objectName={objectDefinition.name}
                  recordId={recordId}
                  objectDefinition={objectDefinition}
                  refreshTrigger={record?.updatedAt}
                />
              ) : (
                <UnderDevelopmentTabContent name={t('history')} underDevelopmentText={t('underDevelopment')} />
              )}
            </TabsContent>

            <TabsContent value="files" className="p-4 mt-0">
              {recordId != null ? (
                <AttachmentsSection
                  objectName={objectDefinition.name}
                  recordId={recordId}
                  canUpdate={canUpdate(objectDefinition.name)}
                />
              ) : (
                <UnderDevelopmentTabContent name={t('files')} underDevelopmentText={t('underDevelopment')} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
