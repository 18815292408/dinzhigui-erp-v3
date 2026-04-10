import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const roleLabels: Record<string, string> = { owner: '管理员', sales: '导购', designer: '设计师', installer: '安装/售后' }
const roleColors: Record<string, string> = { owner: 'bg-purple-100 text-purple-800', sales: 'bg-blue-100 text-blue-800', designer: 'bg-green-100 text-green-800', installer: 'bg-orange-100 text-orange-800' }

export function UserList({ users }: { users: any[] }) {
  return (
    <div className="grid gap-4">
      {users.map((user) => (
        <Card key={user.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{user.display_name}</h3>
              <p className="text-sm text-muted-foreground">
                {user.email} {user.phone ? `· ${user.phone}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={roleColors[user.role]}>
                {roleLabels[user.role]}
              </Badge>
              {user.role !== 'owner' && (
                <Button variant="ghost" size="sm">编辑</Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}