import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Signing you in...</p>
        </CardContent>
      </Card>
    </div>
  )
}
