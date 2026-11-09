"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Home, Target, Gamepad2Icon as GameController2, Settings, Menu, ArrowLeft, Coffee, LogOut } from "lucide-react"
import { useAuthContext } from "@/components/auth/auth-provider"

const navigationItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/puzzle-sprint", label: "Puzzle Sprint", icon: Target },
  { href: "/game-review", label: "Game Review", icon: GameController2 },
  { href: "/settings", label: "Settings", icon: Settings },
]

interface NavigationProps {
  showBackButton?: boolean
  onBackClick?: () => void
  title?: string
}

export default function Navigation({ showBackButton = false, onBackClick, title }: NavigationProps = {}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const { logout } = useAuthContext()

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button for Mobile */}
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackClick}
                className="lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <Link href="/dashboard" className="text-xl lg:text-2xl font-bold text-orange-600">
              {title || "Chessticize"}
            </Link>
          </div>

          {/* Desktop Navigation - Only show on large screens */}
          <div className="hidden lg:flex space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={`flex items-center space-x-2 ${
                      isActive ? "bg-orange-600 hover:bg-orange-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* Mobile/Tablet Menu - Show on medium and smaller screens */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="default" className="h-11 w-11 p-0">
                  <Menu className="h-7 w-7" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Navigation Items */}
                  <div className="space-y-2">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href

                      return (
                        <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                          <Button
                            variant={isActive ? "default" : "ghost"}
                            className={`w-full justify-start space-x-2 ${
                              isActive ? "bg-orange-600 hover:bg-orange-700" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Button>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4" />

                  {/* Sign Out */}
                  <div>
                    <Button
                      onClick={() => {
                        logout()
                        setIsOpen(false)
                      }}
                      variant="ghost"
                      className="w-full justify-start space-x-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Button>
                  </div>

                  {/* Buy me a coffee link */}
                  <div>
                    <Link
                      href="https://coff.ee/tj9bwrx0r6"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start space-x-2 hover:bg-gray-100"
                      >
                        <Coffee className="h-4 w-4" />
                        <span>Buy me a coffee</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Bottom Navigation for Mobile - Only show on small screens */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-50">
        <div className="flex justify-around items-center py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={`flex flex-col items-center py-2 px-1 ${
                  isActive ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium truncate">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
