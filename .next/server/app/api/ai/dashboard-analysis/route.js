"use strict";(()=>{var e={};e.id=6257,e.ids=[6257,2114,5655],e.modules={2934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},5549:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>y,patchFetch:()=>h,requestAsyncStorage:()=>p,routeModule:()=>m,serverHooks:()=>g,staticGenerationAsyncStorage:()=>_});var a={};s.r(a),s.d(a,{GET:()=>u,POST:()=>d});var r=s(9303),o=s(8716),n=s(670),i=s(7070),l=s(5655),c=s(2114);async function u(e){let t=e.cookies.get("session");if(!t)return i.NextResponse.json({error:"请先登录"},{status:401});let s=(0,c.parseSessionUser)(t.value);if(!s)return i.NextResponse.json({error:"登录已过期，请重新登录"},{status:401});let a=await (0,l.i)(),r=s.organization_id,{searchParams:o}=new URL(e.url);if("true"===o.get("history")){let e=parseInt(o.get("days")||"90"),t=new Date;t.setDate(t.getDate()-e);let{data:s,error:n}=await a.from("dashboard_ai_analysis").select("id, insights, summary, total_customers, created_at").eq("organization_id",r).gte("created_at",t.toISOString()).order("created_at",{ascending:!1}).limit(50);return n?(console.error("Failed to fetch analysis history:",n),i.NextResponse.json({error:"获取历史记录失败"},{status:500})):i.NextResponse.json({data:s||[]})}let n=new Date;n.setDate(n.getDate()-7);let{data:u,error:d}=await a.from("dashboard_ai_analysis").select("*").eq("organization_id",r).gte("created_at",n.toISOString()).order("created_at",{ascending:!1}).limit(1);if(d)return console.error("Failed to fetch analysis:",d),i.NextResponse.json({error:"获取历史分析失败"},{status:500});if(!u||0===u.length)return i.NextResponse.json({data:null});let m=u[0];return i.NextResponse.json({data:{insights:m.insights,summary:m.summary,total_customers:m.total_customers,analyzed_at:m.created_at}})}async function d(e){let t=e.cookies.get("session");if(!t)return i.NextResponse.json({error:"请先登录"},{status:401});let s=(0,c.parseSessionUser)(t.value);if(!s)return i.NextResponse.json({error:"登录已过期，请重新登录"},{status:401});if(!["owner","manager"].includes(s.role))return i.NextResponse.json({error:"只有店长或管理员可以运行AI分析"},{status:403});let a=await (0,l.i)(),r=s.organization_id,[o,n,u]=await Promise.all([a.from("customers").select("id, name, phone, house_type, requirements, estimated_price, follow_ups, created_at").eq("organization_id",r),a.from("designs").select("id, customer_id, status, title, description, room_count, total_area, final_price, price, created_at").eq("organization_id",r),a.from("installations").select("id, customer_id, design_id, status, scheduled_date, feedback, created_at").eq("organization_id",r).not("status","in","(completed,cancelled)")]),d=o.data||[],m=n.data||[],p=u.data||[],_=new Date,g=d.map(e=>{let t=[];try{t="string"==typeof e.follow_ups?JSON.parse(e.follow_ups):e.follow_ups||[]}catch{}let s=t.sort((e,t)=>new Date(t.date).getTime()-new Date(e.date).getTime()),a=s[0]||null,r=Math.floor((_.getTime()-new Date(e.created_at).getTime())/864e5),o=a?Math.floor((_.getTime()-new Date(a.date).getTime())/864e5):null,n=m.filter(t=>t.customer_id===e.id),i=p.filter(t=>t.customer_id===e.id),l=n.map(e=>({title:e.title,description:e.description,room_count:e.room_count,total_area:e.total_area,price:e.final_price||e.price,status:e.status})),c=i.map(e=>({scheduled_date:e.scheduled_date,feedback:e.feedback,status:e.status}));return{id:e.id,name:e.name,phone:e.phone,house_type:e.house_type,requirements:e.requirements,estimated_price:e.estimated_price,created_at:e.created_at,days_since_created:r,last_followup_date:a?.date||null,last_followup_content:a?.content||null,days_since_last_followup:o,follow_ups_count:s.length,follow_ups_history:s.slice(0,5),has_design:n.length>0,design_status:n[0]?.status||null,design_count:n.length,design_details:l,has_installation:i.length>0,installation_status:i[0]?.status||null,installation_count:i.length,installation_details:c}}),y=process.env.DEEPSEEK_API_KEY;if(!y||"your-deepseek-api-key"===y)return i.NextResponse.json({error:"DeepSeek API 未配置，请在环境变量中设置 DEEPSEEK_API_KEY"},{status:500});let h=`你是一个全屋定制门店的AI运营助手。请分析以下客户数据，生成结构化的运营洞察。

客户数据：
${JSON.stringify(g,null,2)}

请仔细分析每个客户的完整数据，包括：
- follow_ups_history: 最近的跟进记录（包含内容和时间）
- follow_ups_count: 跟进总次数
- intention_reason: AI分析理由
- requirements: 客户需求描述
- 跟进记录中的内容能反映客户的真实意向和需求变化

请按以下6个类别生成洞察（必须返回严格JSON格式）：
1. **immediate_followup**: 需要立即跟进的客户（有重要跟进内容待处理，或超过7天未跟进）
2. **risk_customers**: 风险客户（超过14天未跟进，或跟进记录显示意向下降或冷淡）
3. **ready_to_close**: 可以成交的客户（有已确认的设计方案，或跟进记录显示客户已确定意向）
4. **silent_customers**: 沉默客户（有设计方案但超过30天无进展，或跟进记录显示长时间无互动）
5. **new_customers**: 本周新客户（7天内新增的客户）
6. **recommendations**: 门店运营建议（基于所有客户数据，给出2-4条具体可执行的建议，要结合跟进记录中的具体内容）

每个类别的结构：
- category: 类别标识
- title: 中文标题（15字以内）
- customers: 相关客户数组（recommendations类别除外）
- recommendations: 建议数组（仅recommendations类别）
- summary: 一句话总结（30字以内）
- priority: high（紧急）/ medium（提醒）/ low（参考）

返回格式（必须是可以直接JSON.parse的JSON字符串，不要有其他任何文字）：
{
  "insights": [
    {"category": "immediate_followup", "title": "立即跟进", "customers": [...], "summary": "...", "priority": "high"},
    {"category": "risk_customers", "title": "风险客户", "customers": [...], "summary": "...", "priority": "high"},
    {"category": "ready_to_close", "title": "即将成交", "customers": [...], "summary": "...", "priority": "medium"},
    {"category": "silent_customers", "title": "沉默客户", "customers": [...], "summary": "...", "priority": "medium"},
    {"category": "new_customers", "title": "本周新客", "customers": [...], "summary": "...", "priority": "low"},
    {"category": "recommendations", "title": "运营建议", "recommendations": [...], "summary": "...", "priority": "low"}
  ],
  "summary": "整体分析总结（50字以内）"
}

【重要】输出规范：
- 所有文字必须使用中文，禁止出现英文字段名或英文单词（除了客户姓名拼音）
- design_status字段值映射：draft=草稿，submitted=已提交，confirmed=已确认
- installation_status字段值映射：pending=待处理，in_progress=进行中，completed=已完成，cancelled=已取消
- recommendations中的客户名称必须使用真实姓名，不要用姓氏缩写
- 每个recommendations建议要具体，结合跟进记录中的具体内容和客户情况，不要说"某客户"或"某个"
- 必须返回严格JSON格式，不要有markdown代码块
- 每个customer对象只需包含id, name, phone, days_since_last_followup, days_since_created, design_status字段
- 如果某类别没有客户，返回空数组
- recommendations类别没有customers字段，只有recommendations数组`;try{let e;let t=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${y}`},body:JSON.stringify({model:"deepseek-chat",messages:[{role:"system",content:"你是一个专业的全屋定制门店运营顾问。请分析客户数据并给出可操作的建议。只返回JSON，不要有其他文字。所有输出必须使用中文，禁止出现英文字段名或英文单词（除了客户姓名拼音）。方案状态映射：draft=草稿，submitted=已提交，confirmed=已确认。安装状态映射：pending=待处理，in_progress=进行中，completed=已完成，cancelled=已取消。"},{role:"user",content:h}],temperature:.3,response_format:{type:"json_object"}})});if(!t.ok){let e=await t.text();return console.error("DeepSeek API error:",e),i.NextResponse.json({error:"AI分析服务异常，请检查API配置"},{status:500})}let o=await t.json(),n=o.choices?.[0]?.message?.content;if(!n)return i.NextResponse.json({error:"AI分析返回为空"},{status:500});try{e=JSON.parse(n)}catch{return console.error("Failed to parse AI response:",n),i.NextResponse.json({error:"AI分析格式异常"},{status:500})}let l=new Date().toISOString(),{error:c}=await a.from("dashboard_ai_analysis").insert({organization_id:r,insights:e.insights,summary:e.summary,total_customers:d.length,analyzed_by:s.id});return c&&console.error("Failed to save analysis:",c),i.NextResponse.json({...e,analyzed_at:l,total_customers:d.length})}catch(e){return console.error("Analysis error:",e),i.NextResponse.json({error:"分析过程异常"},{status:500})}}let m=new r.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/ai/dashboard-analysis/route",pathname:"/api/ai/dashboard-analysis",filename:"route",bundlePath:"app/api/ai/dashboard-analysis/route"},resolvedPagePath:"D:\\zhongyaoruanjian\\dinzhiguiERP\\src\\app\\api\\ai\\dashboard-analysis\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:p,staticGenerationAsyncStorage:_,serverHooks:g}=m,y="/api/ai/dashboard-analysis/route";function h(){return(0,n.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:_})}},5655:(e,t,s)=>{s.d(t,{createClient:()=>o,i:()=>n});var a=s(1470),r=s(1615);async function o(){let e=await (0,r.cookies)(),t="https://pxvkgfvmfjgixwuzdvfb.supabase.co",s="sb_publishable_ItviF55Jm3IXjvfNQsYMXA_xl3rmaYZ";return t&&s&&t.startsWith("http")?(0,a.lx)(t,s,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:s,options:a})=>e.set(t,s,a))}catch{}}}}):(0,a.lx)("https://placeholder.supabase.co","placeholder-key",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:s,options:a})=>e.set(t,s,a))}catch{}}}})}async function n(){let e=process.env.SUPABASE_SERVICE_ROLE_KEY||"";return(0,a.lx)("https://pxvkgfvmfjgixwuzdvfb.supabase.co",e,{cookies:{getAll:()=>[],setAll(){}}})}},2114:(e,t,s)=>{function a(e){try{return JSON.parse(Buffer.from(e,"base64").toString())}catch{return null}}s.r(t),s.d(t,{parseSessionUser:()=>a})}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),a=t.X(0,[9276,1615,1470,5972],()=>s(5549));module.exports=a})();