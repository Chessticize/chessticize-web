import Link from "next/link"
import { Coffee } from "lucide-react"
import { cn } from "@/lib/utils"

interface FooterProps {
  hideOnMobile?: boolean
  className?: string
}

export default function Footer({ hideOnMobile = true, className }: FooterProps = {}) {
  return (
    <footer className={cn(
      "bg-gray-900 text-gray-300 py-4 mt-auto",
      hideOnMobile && "hidden lg:block", // Hide on mobile by default, show on desktop
      className
    )}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">

          {/* Left side - Copyright */}
          <div className="text-sm text-gray-400">
            © 2024 Chessticize
          </div>

          {/* Right side - Buy me a coffee */}
          <div className="flex items-center">
            <Link
              href="https://coff.ee/tj9bwrx0r6"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-sm hover:text-white transition-colors"
            >
              <Coffee className="h-4 w-4" />
              <span>Buy me a coffee</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
