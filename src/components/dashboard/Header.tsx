// src/components/dashboard/Header.tsx
export function Header({ businessName, userEmail }) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Welcome back, {businessName}</h1>
      <div className="text-sm text-gray-600">{userEmail}</div>
    </div>
  )
}
