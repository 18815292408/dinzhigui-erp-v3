import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { parseSessionUser } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  Settings,
  Bell,
  Factory,
  CheckCircle,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  LogIn,
  ArrowLeft,
} from 'lucide-react'

export default async function HelpPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  let roleName = '用户'
  let isLoggedIn = false

  if (sessionCookie) {
    const user = parseSessionUser(sessionCookie.value)
    if (user) {
      isLoggedIn = true
      const supabase = await createClient()
      const { data: profile } = await supabase
        .from('users')
        .select('display_name, role')
        .eq('id', user.id)
        .single()

      const roleNameMap: Record<string, string> = {
        owner: '老板',
        manager: '店长',
        sales: '导购',
        designer: '设计师',
        installer: '安装/售后',
      }

      roleName = roleNameMap[profile?.role || user.role] || '用户'
    }
  }

  return (
    <div className="min-h-screen bg-apple-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {!isLoggedIn && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/login" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              返回登录
            </Link>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold">使用说明</h1>
          <p className="text-muted-foreground mt-1">
            快速了解系统，5分钟上手{isLoggedIn ? `（当前角色：${roleName}）` : ''}
          </p>
        </div>

        {/* 快速入门 */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Lightbulb className="w-5 h-5" />
              快速入门：我是{roleName}，怎么用这个系统？
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {roleName === '导购' && (
                <>
                  <QuickStep icon={<Users className="w-6 h-6" />} title="录入客户" desc="客户进店 → 客户管理 → 新建客户 → 填写姓名电话房型" color="bg-blue-100 text-blue-700" />
                  <QuickStep icon={<FileText className="w-6 h-6" />} title="跟进记录" desc="每次沟通后 → 客户详情 → 添加跟进记录" color="bg-green-100 text-green-700" />
                  <QuickStep icon={<ChevronRight className="w-6 h-6" />} title="转交设计" desc="客户签单后 → 点击转交设计 → 选择设计师 → 填金额" color="bg-purple-100 text-purple-700" />
                  <QuickStep icon={<LayoutDashboard className="w-6 h-6" />} title="查看业绩" desc="数据看板 → 查看本月签单数和金额" color="bg-orange-100 text-orange-700" />
                </>
              )}
              {roleName === '设计师' && (
                <>
                  <QuickStep icon={<Bell className="w-6 h-6" />} title="接单" desc="登录后 → 消息中心 → 找到新订单 → 点击接单" color="bg-red-100 text-red-700" />
                  <QuickStep icon={<FileText className="w-6 h-6" />} title="做方案" desc="方案管理 → 编辑方案 → 填信息 → 上传CAD → 粘贴酷家乐" color="bg-blue-100 text-blue-700" />
                  <QuickStep icon={<CheckCircle className="w-6 h-6" />} title="提交方案" desc="方案完成 → 保存并提交 → 等待确认" color="bg-green-100 text-green-700" />
                  <QuickStep icon={<Factory className="w-6 h-6" />} title="确认下单" desc="待下单阶段 → 选择工厂 → 点击确认下单" color="bg-purple-100 text-purple-700" />
                </>
              )}
              {roleName === '安装/售后' && (
                <>
                  <QuickStep icon={<Wrench className="w-6 h-6" />} title="查看任务" desc="安装管理 → 查看分配给自己的安装单" color="bg-blue-100 text-blue-700" />
                  <QuickStep icon={<ChevronRight className="w-6 h-6" />} title="确认到货" desc="点击安装单 → 选择日期 → 确认已到货" color="bg-green-100 text-green-700" />
                  <QuickStep icon={<FileText className="w-6 h-6" />} title="记录反馈" desc="安装中 → 添加反馈记录 → 写情况 → 拍照" color="bg-orange-100 text-orange-700" />
                  <QuickStep icon={<CheckCircle className="w-6 h-6" />} title="完成安装" desc="装完 → 点击确认完成 → 如有售后记录反馈" color="bg-purple-100 text-purple-700" />
                </>
              )}
              {(roleName === '老板' || roleName === '店长') && (
                <>
                  <QuickStep icon={<LayoutDashboard className="w-6 h-6" />} title="看数据" desc="每天早上 → 数据看板 → 看订单进度和业绩" color="bg-blue-100 text-blue-700" />
                  <QuickStep icon={<Users className="w-6 h-6" />} title="管订单" desc="客户管理 → 订单跟进 → 处理待打款/待出货" color="bg-green-100 text-green-700" />
                  <QuickStep icon={<Settings className="w-6 h-6" />} title="管账号" desc="账号管理 → 添加/编辑员工 → 设置角色密码" color="bg-orange-100 text-orange-700" />
                  <QuickStep icon={<Wrench className="w-6 h-6" />} title="处理异常" desc="订单做错 → 客户详情 → 回退到上一阶段" color="bg-red-100 text-red-700" />
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg p-3">
              <ChevronRight className="w-4 h-4" />
              <span>下面有更详细的图文说明，遇到问题可以往下翻查看</span>
            </div>
          </CardContent>
        </Card>

        {/* 系统整体流程图 */}
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <ChevronRight className="w-5 h-5" />
              系统整体流程图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <FlowNode number={1} title="客户进店" role="导购" color="bg-blue-100 text-blue-700 border-blue-200" />
              <FlowArrowRight />
              <FlowNode number={2} title="录入信息" role="导购" color="bg-blue-100 text-blue-700 border-blue-200" />
              <FlowArrowRight />
              <FlowNode number={3} title="跟进意向" role="导购" color="bg-blue-100 text-blue-700 border-blue-200" />
              <FlowArrowRight />
              <FlowNode number={4} title="客户签单" role="导购" color="bg-blue-100 text-blue-700 border-blue-200" />
              <FlowArrowRight />
              <FlowNode number={5} title="设计师接单" role="设计师" color="bg-green-100 text-green-700 border-green-200" />
              <FlowArrowRight />
              <FlowNode number={6} title="设计方案" role="设计师" color="bg-green-100 text-green-700 border-green-200" />
              <FlowArrowRight />
              <FlowNode number={7} title="提交方案" role="设计师" color="bg-green-100 text-green-700 border-green-200" />
              <FlowArrowRight />
              <FlowNode number={8} title="确认下单" role="设计师" color="bg-green-100 text-green-700 border-green-200" />
              <FlowArrowRight />
              <FlowNode number={9} title="确认打款" role="老板/店长" color="bg-purple-100 text-purple-700 border-purple-200" />
              <FlowArrowRight />
              <FlowNode number={10} title="分配师傅" role="老板/店长" color="bg-purple-100 text-purple-700 border-purple-200" />
              <FlowArrowRight />
              <FlowNode number={11} title="确认到货" role="安装师傅" color="bg-orange-100 text-orange-700 border-orange-200" />
              <FlowArrowRight />
              <FlowNode number={12} title="安装施工" role="安装师傅" color="bg-orange-100 text-orange-700 border-orange-200" />
              <FlowArrowRight />
              <FlowNode number={13} title="安装完成" role="安装师傅" color="bg-orange-100 text-orange-700 border-orange-200" />
              <FlowArrowRight />
              <FlowNode number={14} title="售后跟进" role="安装师傅" color="bg-orange-100 text-orange-700 border-orange-200" />
              <FlowArrowRight />
              <FlowNode number={15} title="订单完结" role="系统" color="bg-gray-100 text-gray-700 border-gray-200" />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>导购</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>设计师</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span>老板/店长</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span>安装师傅</span>
            </div>
          </CardContent>
        </Card>

        {/* 1. 登录系统 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-blue-500" />
              第一步：登录系统
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>打开浏览器，输入网址 <strong>https://xiexiusq.cn</strong>，进入登录页面。</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>账号：您的手机号（老板/店长在"账号管理"里给您设置的）</li>
              <li>密码：初始密码一般是 123456，登录后建议修改</li>
            </ul>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/login.png"
                alt="登录页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <p className="text-muted-foreground">登录成功后，您会看到系统的数据看板页面，也就是"首页"。</p>
          </CardContent>
        </Card>

        {/* 2. 数据看板 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-blue-500" />
              数据看板 — 系统的"首页"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>登录后默认进入的就是数据看板，相当于系统的"总控制台"。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/1-dashboard.png"
                alt="数据看板截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">页面上能看到什么？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>顶部时间筛选</strong>：可以切换"今日/本周/本月/全部"，查看不同时段的数据</li>
                <li><strong>订单流程卡片</strong>：待派单、设计中、待下单、待打款、出货/安装中、售后中、本月完成 —— 每个卡片显示当前阶段的订单数量，点击可以直接跳转到对应的客户列表</li>
                <li><strong>AI 运营分析</strong>：系统自动分析当前运营状况，提示流程卡点、金额关注、本周动态、运营建议</li>
                <li><strong>月度业绩</strong>：显示本月签单数、签单金额、收款金额、设计师业绩等统计数据</li>
                <li><strong>销售签单与收款</strong>：各导购的业绩排名</li>
                <li><strong>设计师接单业绩</strong>：各设计师的接单数和金额</li>
                <li><strong>设计师下单到工厂业绩</strong>：各设计师下单到工厂的明细</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：老板/店长每天早上第一件事就是打开这个页面，看一眼就知道今天有哪些订单要处理、有没有卡住的环节。</p>
          </CardContent>
        </Card>

        {/* 3. 客户管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              客户管理 — 管理所有客户和订单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>客户管理是系统的核心页面，分为两个标签页：<strong>新建客户</strong>（还没下单的意向客户）和 <strong>订单跟进</strong>（已经签单、正在走流程的客户）。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/2-customers.png"
                alt="客户管理页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">新建客户标签页：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>显示所有还没有正式订单的客户</li>
                <li>点击客户名字可以查看详情、添加跟进记录</li>
                <li>点击"新建客户"按钮可以录入新客户</li>
              </ul>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/11-order-followup.png"
                alt="订单跟进标签页截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">订单跟进标签页：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>显示所有已经签单、正在走流程的客户</li>
                <li>顶部有阶段筛选：全部、待派单、设计中、待下单、待打款、出货/安装中、售后中</li>
                <li>点击客户名字可以查看订单详情、操作订单状态</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 4. 新建客户 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              新建客户 — 录入意向客户信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>当有新客户进店咨询时，导购/销售需要在这里录入客户信息。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/3-new-customer.png"
                alt="新建客户页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">需要填写哪些信息？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>客户姓名</strong>：必填，客户的真实姓名</li>
                <li><strong>联系电话</strong>：必填，客户的手机号</li>
                <li><strong>房型</strong>：必填，如"三室两厅"、"两室一厅"等</li>
                <li><strong>需求描述</strong>：选填，客户想要什么风格、材质、预算等</li>
                <li><strong>客户意向</strong>：选填，如"高意向"、"考虑中"、"低意向"</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：电话和姓名一定要填对，后续所有订单都靠这个关联。填完点击"保存"，客户就出现在"新建客户"列表里了。</p>
          </CardContent>
        </Card>

        {/* 5. 客户详情 / 订单详情 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-orange-500" />
              客户详情 / 订单详情 — 查看完整信息和操作订单
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>点击客户名字进入详情页，这里可以看到客户的所有信息和订单状态，也是操作订单的地方。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/12-order-detail.png"
                alt="订单详情页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">详情页里有什么？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>客户信息</strong>：姓名、电话、房型、创建时间</li>
                <li><strong>跟进记录</strong>：每次和客户沟通后添加的记录，按时间倒序排列</li>
                <li><strong>订单信息</strong>：订单号、当前状态、签单金额、设计师、安装师傅</li>
                <li><strong>操作按钮</strong>：根据当前阶段显示不同的操作，如"转交设计"、"确认打款"、"分配安装师傅"等</li>
                <li><strong>回退按钮</strong>：如果操作错了，老板/店长可以回退到上一阶段</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：每次和客户通完电话或见面后，都来这里加一条跟进记录，写清楚沟通内容、客户反馈、下一步计划。这样换同事接手时也能快速了解情况。</p>
          </CardContent>
        </Card>

        {/* 6. 方案管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              方案管理 — 设计师的工作台
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>设计师在这个页面查看自己的设计任务，编辑方案信息。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/4-designs.png"
                alt="方案管理页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">页面说明：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>显示所有分配给当前设计师的任务（老板/店长可以看到全部）</li>
                <li>每个方案卡片显示：方案名称、关联订单号、客户姓名、面积、当前状态</li>
                <li>点击方案名称进入编辑页面</li>
                <li>状态标签显示订单当前阶段：待接单、设计中、待下单等</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">设计师在方案编辑页需要做什么？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>填写方案名称、房间数量、总面积、成交价</li>
                <li>写清楚方案描述：风格、材质、颜色、特殊要求等</li>
                <li>上传 CAD 图纸文件</li>
                <li>粘贴酷家乐方案链接</li>
                <li>完成后点击"保存并提交方案"</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：方案描述写得越详细越好，减少后续和工厂、安装师傅的沟通成本。CAD文件和酷家乐链接一定要上传，这是工厂生产和安装的依据。</p>
          </CardContent>
        </Card>

        {/* 7. 安装管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              安装管理 — 安装师傅的工作台
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>安装师傅在这个页面查看分配给自己的安装任务，确认出货日期、记录安装情况。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/5-installations.png"
                alt="安装管理页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">页面说明：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>显示所有待安装、进行中的安装单</li>
                <li>每个安装单显示：客户姓名、地址（如有）、关联订单号、当前状态</li>
                <li>点击安装单进入详情页</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">安装师傅在详情页需要做什么？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>确认预计出货/到货日期</li>
                <li>货物到齐后点击"确认已到货"</li>
                <li>安装过程中添加安装反馈记录（拍照、文字描述）</li>
                <li>安装完成后点击"确认完成安装"</li>
                <li>如有售后问题，记录售后反馈，处理完点击"售后完成"</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：安装反馈记录很重要，要写清楚安装情况、客户是否满意、有没有遗留问题。这是后续售后处理的依据。</p>
          </CardContent>
        </Card>

        {/* 8. 已完成订单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              已完成订单 — 历史订单归档
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>所有流程走完、标记为"已完结"的订单会自动归档到这里，方便随时查阅。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/6-completed-orders.png"
                alt="已完成订单页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">页面说明：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>显示所有已完结的订单，按完成时间倒序排列</li>
                <li>可以搜索客户姓名或订单号快速查找</li>
                <li>点击订单查看完整信息：客户资料、方案详情、安装记录、售后反馈</li>
                <li>用于售后查询、业绩统计、客户回访</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：已完结的订单不能修改，但可以随时查看。如果客户几年后找过来问当初做了什么，来这里一查就知道。</p>
          </CardContent>
        </Card>

        {/* 9. 工厂管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-gray-500" />
              工厂管理 — 管理合作工厂
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>在这里录入和维护合作的家具工厂信息，下单时直接选择，不用每次手动填写。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/7-factories.png"
                alt="工厂管理页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">需要录入哪些信息？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>工厂名称</strong>：必填，如"XX木业"</li>
                <li><strong>联系人</strong>：工厂对接人的姓名</li>
                <li><strong>联系电话</strong>：工厂的电话</li>
                <li><strong>地址</strong>：工厂的具体地址</li>
                <li><strong>备注</strong>：特殊说明，如"专做实木"、"交货快"等</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：建议把常合作的工厂都录进去，下单时直接选，避免填错电话或地址。可以按工厂特点写备注，方便选择合适的工厂。</p>
          </CardContent>
        </Card>

        {/* 10. 消息中心 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500" />
              消息中心 — 系统的"通知栏"
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>系统的消息通知都集中在这里，就像微信的消息列表。有新订单、待接单、紧急事项时会在这里提醒。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/8-notifications.png"
                alt="消息中心页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">常见的消息类型：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>新订单通知</strong>：导购转交设计后，设计师会收到通知</li>
                <li><strong>待接单提醒</strong>：设计师需要在消息中心点击"接单"</li>
                <li><strong>方案提交通知</strong>：设计师提交方案后，相关人员收到通知</li>
                <li><strong>安装分配通知</strong>：分配安装师傅后，师傅收到通知</li>
                <li><strong>系统公告</strong>：管理员发布的重要通知</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：页面右上角有个铃铛图标，有未读消息时会显示红点。设计师尤其要注意看消息中心，有新订单时第一时间接单。</p>
          </CardContent>
        </Card>

        {/* 11. 账号管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              账号管理 — 管理员工账号
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>只有老板和店长能看到这个页面，用来添加、编辑、删除员工账号。</p>
            <div className="rounded-lg border overflow-hidden">
              <Image
                src="/screenshots/9-users.png"
                alt="账号管理页面截图"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">可以做什么？</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>添加员工</strong>：点击"添加用户"，填写姓名、手机号、密码、角色</li>
                <li><strong>编辑信息</strong>：点击员工名字，修改姓名、密码、角色</li>
                <li><strong>删除账号</strong>：员工离职后，可以删除账号</li>
                <li><strong>查看角色</strong>：每个员工的角色决定了能看到哪些页面、能做什么操作</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium">角色说明：</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>老板</strong>：能看到所有页面，包括管理员面板</li>
                <li><strong>店长</strong>：能看到数据看板、客户管理、账号管理，可以操作订单</li>
                <li><strong>导购</strong>：能看到客户管理，负责录入客户和跟进</li>
                <li><strong>设计师</strong>：能看到方案管理、消息中心，负责出方案</li>
                <li><strong>安装师傅</strong>：能看到安装管理，负责安装和售后</li>
              </ul>
            </div>
            <p className="text-muted-foreground"><strong>温馨提示</strong>：给员工设置角色时要谨慎，角色决定了权限。比如导购不能看到别人的客户，设计师只能看到自己的任务。</p>
          </CardContent>
        </Card>

        {/* 12. 订单全流程 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-green-500" />
              一个订单从头到尾怎么走？
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">全屋定制的一个客户订单，在系统里会经历以下阶段，每个阶段由不同的人负责：</p>

            <div className="space-y-3">
              <Step number={1} title="待派单" role="导购/销售" desc="在'客户管理'录入客户信息，点击'转交设计'，选择设计师，填写签单金额。订单生成，进入待派单状态。" />
              <Step number={2} title="待接单" role="设计师" desc="设计师在'消息中心'收到新订单通知，点击'接单'，选择预计完成天数。订单进入设计中状态。" />
              <Step number={3} title="设计中" role="设计师" desc="设计师在'方案管理'里编辑方案：填写房间数量、面积、成交价、方案描述，上传CAD图纸，添加酷家乐链接。" />
              <Step number={4} title="待下单" role="设计师" desc="设计师完成方案后，点击'保存并提交方案'。订单进入待下单状态。设计师在方案详情页选择工厂，点击'确认下单'。" />
              <Step number={5} title="待打款" role="老板/店长" desc="老板/店长确认给工厂的款项，在客户详情页点击'确认打款'。订单进入待出货状态。" />
              <Step number={6} title="待出货" role="老板/店长" desc="老板/店长给订单分配安装师傅。安装师傅在'安装管理'里看到自己的任务。" />
              <Step number={7} title="安装中" role="安装师傅" desc="安装师傅确认预计出货/到货日期，货物到齐后开始安装，在系统里添加安装反馈记录。安装完成后标记'已安装'。" />
              <Step number={8} title="售后中" role="安装师傅" desc="如果客户有售后问题，订单进入售后状态。安装师傅记录售后反馈，处理完成后点击'售后完成'。" />
              <Step number={9} title="已完结" role="系统自动" desc="所有流程走完，订单自动归档到'已完成订单'，可以随时查看历史记录。" />
            </div>
          </CardContent>
        </Card>

        {/* 13. 各角色工作清单 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              我是XXX，我每天该做什么？
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <RoleSection title="导购/销售" color="bg-blue-50 text-blue-800">
              <li>客户进店后，在'客户管理'点击'新建客户'，录入客户信息</li>
              <li>定期给客户打电话/发微信，然后在客户详情页添加'跟进记录'</li>
              <li>客户确定签单后，点击'转交设计'，选择设计师，填写签单金额</li>
              <li>每天查看'数据看板'，了解自己的签单业绩</li>
            </RoleSection>

            <RoleSection title="设计师" color="bg-green-50 text-green-800">
              <li>每天登录先看'消息中心'，有没有新订单待接单</li>
              <li>在'方案管理'里找到自己的任务，点击编辑方案</li>
              <li>填写方案信息：房间数、面积、成交价、方案描述</li>
              <li>上传CAD文件，粘贴酷家乐链接</li>
              <li>方案完成后点击'保存并提交方案'</li>
              <li>在'待下单'阶段，选择工厂，点击'确认下单'</li>
            </RoleSection>

            <RoleSection title="安装师傅" color="bg-orange-50 text-orange-800">
              <li>在'安装管理'查看分配给自己的安装单</li>
              <li>确认预计出货/到货日期</li>
              <li>货物到齐后开始安装，添加安装反馈记录</li>
              <li>安装完成后，点击'确认完成安装'</li>
              <li>如有售后问题，记录售后反馈，处理完点击'售后完成'</li>
            </RoleSection>

            <RoleSection title="老板/店长" color="bg-purple-50 text-purple-800">
              <li>每天早上打开'数据看板'，看整体运营状况</li>
              <li>查看AI运营分析，有没有流程卡点需要处理</li>
              <li>在'待打款'阶段确认打款给工厂</li>
              <li>在'待出货'阶段分配安装师傅</li>
              <li>在'账号管理'添加新员工账号、修改密码</li>
              <li>如果某一步做错了，可以点击'回退到上一阶段'</li>
            </RoleSection>
          </CardContent>
        </Card>

        {/* 14. 常见问题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              常见问题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <QA question="我忘了密码怎么办？">
              联系老板或店长，在'账号管理'里点击您的名字，选择'编辑'，设置新密码。
            </QA>
            <QA question="订单信息填错了能改吗？">
              大部分信息可以改。如果阶段走错了，老板/店长可以在客户详情页点击'回退到上一阶段'。如果是客户姓名、电话等基础信息填错，可以直接在客户详情页修改。
            </QA>
            <QA question="设计师怎么接单？">
              设计师登录后，页面右上角铃铛图标会有红点提醒。点击进去'消息中心'，找到待接单通知，点击绿色的'接单'按钮，选择预计完成天数即可。
            </QA>
            <QA question="怎么查看本月业绩？">
              老板/店长进入'数据看板'，页面下方有'月度业绩'区域，可以看到签单金额、收款金额、设计师业绩等。也可以切换"本月"时间筛选查看。
            </QA>
            <QA question="安装师傅怎么确认到货？">
              安装师傅进入'安装管理'，点击自己的安装单，在'预计出货/到货日期'下面选择日期，点击'确认已到货'。货物到齐后才能开始安装。
            </QA>
            <QA question="系统里的金额怎么填？">
              金额统一按<strong>万元</strong>填写。比如签单金额是5万8，就填5.8。系统会自动换算显示为"¥5.8万"。
            </QA>
            <QA question="客户想退单怎么办？">
              目前系统没有直接的退单功能。建议老板/店长在客户详情页添加跟进记录说明退单原因，然后联系系统管理员处理。
            </QA>
            <QA question="怎么导出数据？">
              目前系统支持在数据看板查看统计，暂不支持一键导出Excel。如需导出，请联系系统管理员。
            </QA>
          </CardContent>
        </Card>

        {/* 15. 使用小技巧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              使用小技巧
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong>1. 跟进记录很重要</strong>：每次和客户沟通后，都写一条跟进记录，方便后续同事接手。写清楚时间、沟通内容、客户反馈、下一步计划。</p>
            <p><strong>2. 消息中心常看看</strong>：紧急事项会弹窗提醒，不要错过。设计师尤其要注意，有新订单时第一时间接单。</p>
            <p><strong>3. 数据看板每天刷</strong>：老板/店长早上看一眼，就知道今天有哪些事要处理、有没有卡住的订单。</p>
            <p><strong>4. 工厂信息提前录</strong>：在'工厂管理'里把常合作的工厂录进去，下单时直接选，不用每次填。备注里写清楚工厂特点。</p>
            <p><strong>5. 方案描述写清楚</strong>：设计师写方案时，风格、材质、颜色写详细，减少后续沟通成本。CAD和酷家乐链接一定要传。</p>
            <p><strong>6. 安装反馈要详细</strong>：安装师傅记录反馈时，写清楚安装情况、客户满意度、遗留问题。拍照留存更好。</p>
            <p><strong>7. 金额单位记清楚</strong>：系统里金额按万元填，5万8填5.8，不要填58000。</p>
            <p><strong>8. 角色权限要分清</strong>：给员工设置角色时要谨慎，导购看不到别人的客户，设计师只能看自己的任务。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Step({ number, title, role, desc }: { number: number; title: string; role: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
          {number}
        </div>
        {number < 9 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
      </div>
      <div className="pb-4">
        <p className="font-medium text-sm">{title} <span className="text-xs font-normal text-muted-foreground">（{role}）</span></p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function RoleSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className={`px-3 py-2 text-sm font-medium ${color}`}>{title}</div>
      <ul className="p-3 space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
        {children}
      </ul>
    </div>
  )
}

function QA({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-medium text-sm">Q：{question}</p>
      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">A：{children}</p>
    </div>
  )
}

function QuickStep({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="rounded-xl bg-white border p-4 space-y-2 shadow-sm">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        {icon}
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function FlowNode({ number, title, role, color }: { number: number; title: string; role: string; color: string }) {
  return (
    <div className={`rounded-xl border p-2.5 space-y-1 shadow-sm text-center min-w-[90px] ${color}`}>
      <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-bold mx-auto">
        {number}
      </div>
      <p className="font-medium text-[11px] leading-tight">{title}</p>
      <span className="text-[10px] opacity-75">{role}</span>
    </div>
  )
}

function FlowArrowRight() {
  return (
    <div className="text-gray-400 shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </div>
  )
}
