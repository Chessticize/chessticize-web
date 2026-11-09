import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

interface DevelopmentNoticeProps {
  className?: string
}

export function DevelopmentNotice({ className }: DevelopmentNoticeProps) {
  return (
    <Alert className={`border-orange-200 bg-orange-50 text-orange-800 ${className || ''}`}>
      <Info className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 font-semibold">
        Early Access - Under Development
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        This is a hobby project in early development. Some features are incomplete and some functionality may be limited. 
        Thank you for trying Chessticize!
      </AlertDescription>
    </Alert>
  )
}
