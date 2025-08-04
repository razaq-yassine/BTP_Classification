import { useState } from 'react'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Construction } from 'lucide-react'

interface GenericObjectDetailViewSideSectionProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
}

// Component for tab content that is under development
function UnderDevelopmentTabContent({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center py-4 text-muted-foreground">
      <div className="text-center">
        <Construction className="h-8 w-8 mx-auto mb-2 text-orange-500" />
        <p className="text-sm font-medium">{name} - Under Development</p>
      </div>
    </div>
  );
}

// Upper card component with Activity and History tabs
function UpperSideCard({ objectDefinition: _, record: __ }: GenericObjectDetailViewSideSectionProps) {
  // Parameters prefixed with underscore to indicate intentional non-use
  const [activeTab, setActiveTab] = useState('activity');
  
  return (
    <Card className="mb-4 py-1">
      <CardContent className="p-0">
        <Tabs defaultValue="activity" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activity" className="p-4 mt-0">
            <UnderDevelopmentTabContent name="Activity" />
          </TabsContent>
          
          <TabsContent value="history" className="p-4 mt-0">
            <UnderDevelopmentTabContent name="History" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Lower card component with Communication and Files tabs
function LowerSideCard({ objectDefinition: _, record: __ }: GenericObjectDetailViewSideSectionProps) {
  // Parameters prefixed with underscore to indicate intentional non-use
  const [activeTab, setActiveTab] = useState('communication');
  
  return (
    <Card className='py-1'>
      <CardContent className="p-0">
        <Tabs defaultValue="communication" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="communication" className="flex-1">Communication</TabsTrigger>
            <TabsTrigger value="files" className="flex-1">Files</TabsTrigger>
          </TabsList>
          
          <TabsContent value="communication" className="p-4 mt-0">
            <UnderDevelopmentTabContent name="Communication" />
          </TabsContent>
          
          <TabsContent value="files" className="p-4 mt-0">
            <UnderDevelopmentTabContent name="Files" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function GenericObjectDetailViewSideSection({ objectDefinition, record }: GenericObjectDetailViewSideSectionProps) {
  return (
    <div className="space-y-4">
      <UpperSideCard objectDefinition={objectDefinition} record={record} />
      <LowerSideCard objectDefinition={objectDefinition} record={record} />
    </div>
  );
}
