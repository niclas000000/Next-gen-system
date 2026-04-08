export default function DesignerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col -m-6">
      {children}
    </div>
  )
}
