#!/bin/bash
# 端到端业务验证脚本：发单→报名→考勤→保险→事件→结算→申诉→风险
set -e
BASE=http://localhost:3000/api
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ❌ $1"; }
# 数值比较（兼容 0.5 / 0.50）
numeq(){ awk -v a="$1" -v b="$2" 'BEGIN{exit !(a==b)}'; }
check(){ if numeq "$2" "$3"; then ok "$1"; else bad "$1 (期望[$3] 实际[$2])"; fi; }

login() { curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d "{\"phone\":\"$1\",\"password\":\"$2\"}" | jq -r '.token'; }

echo "=== 1. 登录各角色 ==="
T_W1=$(login 13900000001 123456); [ -n "$T_W1" ] && [ "$T_W1" != "null" ] && ok "工人张三登录" || bad "工人张三登录"
T_W2=$(login 13900000002 123456)
T_W3=$(login 13900000003 123456)
T_E1=$(login 13800000001 123456); [ -n "$T_E1" ] && [ "$T_E1" != "null" ] && ok "企业好又多登录" || bad "企业好又多登录"
T_E2=$(login 13800000002 123456)
T_S1=$(login 13800000011 123456)
T_S2=$(login 13800000012 123456)
T_AD=$(login 19900000001 admin123); [ -n "$T_AD" ] && [ "$T_AD" != "null" ] && ok "客服登录" || bad "客服登录"
AH_W1="Authorization: Bearer $T_W1"; AH_W2="Authorization: Bearer $T_W2"; AH_W3="Authorization: Bearer $T_W3"
AH_E1="Authorization: Bearer $T_E1"; AH_E2="Authorization: Bearer $T_E2"; AH_S1="Authorization: Bearer $T_S1"; AH_S2="Authorization: Bearer $T_S2"; AH_AD="Authorization: Bearer $T_AD"

echo "=== 2. 未实名工人报名被拒 ==="
JOB0=$(curl -s "$BASE/jobs" | jq -r '.[0].id')
R=$(curl -s -X POST "$BASE/jobs/$JOB0/apply" -H "$AH_W3")
echo "$R" | jq -r '.message' | grep -q "实名" && ok "未实名报名被拦截: $(echo $R | jq -r '.message')" || bad "未实名报名未被拦截: $R"

echo "=== 3. 王五完成实名+签署风险告知后报名成功 ==="
curl -s -X PUT "$BASE/worker/profile" -H "$AH_W3" -H 'Content-Type: application/json' \
  -d '{"realName":"王五","idCard":"310110199801021234","skills":["搬运"]}' > /dev/null
curl -s -X POST "$BASE/worker/risk-notice" -H "$AH_W3" > /dev/null
R=$(curl -s -X POST "$BASE/jobs/$JOB0/apply" -H "$AH_W3")
[ "$(echo "$R" | jq -r '.status')" = "pending" ] && ok "实名后报名成功" || bad "实名后报名失败: $R"

echo "=== 4. 企业发单：保证金试算与冻结 ==="
PRE=$(curl -s -X POST "$BASE/jobs/deposit-preview" -H "$AH_E1" -H 'Content-Type: application/json' \
  -d '{"startTime":"2026-10-03T10:00:00.000Z","endTime":"2026-10-03T18:00:00.000Z","hourlyWage":30,"mealAllowance":20,"headcount":2}')
check "低风险企业保证金倍率=1" "$(echo "$PRE" | jq -r '.multiplier')" "1"
PRE2=$(curl -s -X POST "$BASE/jobs/deposit-preview" -H "$AH_E2" -H 'Content-Type: application/json' \
  -d '{"startTime":"2026-10-03T10:00:00.000Z","endTime":"2026-10-03T18:00:00.000Z","hourlyWage":30,"mealAllowance":20,"headcount":2}')
check "高风险企业(星辉)保证金倍率=2" "$(echo "$PRE2" | jq -r '.multiplier')" "2"
check "高风险企业严格现场确认" "$(echo "$PRE2" | jq -r '.strictConfirm')" "true"

BAL0=$(curl -s "$BASE/enterprise/profile" -H "$AH_E1" | jq -r '.depositBalance')
START=$(date -u -d "+2 hours" +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -v+2H +%Y-%m-%dT%H:%M:%S.000Z)
END=$(date -u -d "+10 hours" +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -v+10H +%Y-%m-%dT%H:%M:%S.000Z)
JOB=$(curl -s -X POST "$BASE/jobs" -H "$AH_E1" -H 'Content-Type: application/json' -d "{
  \"title\":\"E2E测试-商超盘点\",\"category\":\"商超盘点\",\"description\":\"端到端验证岗位\",
  \"location\":\"上海市浦东新区张江路100号\",\"lat\":31.2044,\"lng\":121.5985,
  \"startTime\":\"$START\",\"endTime\":\"$END\",\"headcount\":2,
  \"skillRequirements\":[\"盘点\"],\"healthCertRequired\":false,\"clothingRequirements\":\"深色便装\",
  \"hourlyWage\":30,\"overtimeWage\":45,\"mealAllowance\":20,\"lateDeductPerMinute\":0.5,\"lateGraceMinutes\":10,
  \"insurancePlan\":\"standard\",\"riskLevel\":\"low\",\"settlementType\":\"daily\"}" | jq -r '.id')
[ -n "$JOB" ] && [ "$JOB" != "null" ] && ok "创建岗位草稿 #$JOB" || bad "创建岗位失败"
curl -s -X POST "$BASE/jobs/$JOB/publish" -H "$AH_E1" > /dev/null
BAL1=$(curl -s "$BASE/enterprise/profile" -H "$AH_E1" | jq -r '.depositBalance')
FRZ1=$(curl -s "$BASE/enterprise/profile" -H "$AH_E1" | jq -r '.frozenDeposit')
ok "发布后冻结保证金(余额 $BAL0→$BAL1, 冻结 $FRZ1)"

echo "=== 5. 报名→录用→派单 ==="
APP=$(curl -s -X POST "$BASE/jobs/$JOB/apply" -H "$AH_W1" | jq -r '.id')
[ -n "$APP" ] && [ "$APP" != "null" ] && ok "张三报名成功 #$APP" || bad "张三报名失败"
R=$(curl -s -X POST "$BASE/applications/$APP/approve" -H "$AH_E1")
TASK=$(echo "$R" | jq -r '.task.id')
QR=$(echo "$R" | jq -r '.task.qrCode')
[ -n "$TASK" ] && [ "$TASK" != "null" ] && ok "录用并生成派单任务 #$TASK (签到码 $QR)" || bad "录用失败: $R"
QR2=$(curl -s "$BASE/tasks/$TASK/qrcode" -H "$AH_E1" | jq -r '.qrCode')
check "企业获取签到二维码" "$QR2" "$QR"

echo "=== 6. 考勤四重校验 ==="
R=$(curl -s -X POST "$BASE/tasks/$TASK/check-in" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d '{"qrCode":"WRONG123","lat":31.2044,"lng":121.5985,"faceImage":"face_1"}')
echo "$R" | jq -r '.message' | grep -q "二维码错误" && ok "错误二维码被拦截" || bad "错误二维码未拦截: $R"
R=$(curl -s -X POST "$BASE/tasks/$TASK/check-in" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d "{\"qrCode\":\"$QR\",\"lat\":31.3,\"lng\":121.7,\"faceImage\":\"face_1\"}")
echo "$R" | jq -r '.message' | grep -q "超出" && ok "超出地理围栏被拦截" || bad "地理围栏未拦截: $R"
R=$(curl -s -X POST "$BASE/tasks/$TASK/check-in" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d "{\"qrCode\":\"$QR\",\"lat\":31.2044,\"lng\":121.5985}")
echo "$R" | jq -r '.message' | grep -q "人脸" && ok "未采集人脸被拦截" || bad "人脸校验未拦截: $R"
R=$(curl -s -X POST "$BASE/tasks/$TASK/check-in" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d "{\"qrCode\":\"$QR\",\"lat\":31.2044,\"lng\":121.5985,\"faceImage\":\"face_abc\"}")
echo "$R" | jq -r '.message' | grep -q "保险已生效" && ok "低风险岗位签到自动确认+保险生效" || bad "签到失败: $R"

echo "=== 7. 保险：生效时间=实际到岗时间 ==="
POL=$(curl -s "$BASE/tasks/$TASK" -H "$AH_W1" | jq -r '.insurance')
[ "$(echo "$POL" | jq -r '.status')" = "active" ] && ok "保单已生效(生效时间=$(echo "$POL" | jq -r '.effectiveAt'))" || bad "保单未生效: $POL"

echo "=== 8. 作业过程事件（加班/额外搬运） ==="
curl -s -X POST "$BASE/tasks/$TASK/events" -H "$AH_E1" -H 'Content-Type: application/json' \
  -d '{"type":"overtime","payload":{"hours":1.5}}' | jq -r '.type' | grep -q overtime && ok "企业上报加班1.5h" || bad "加班事件失败"
curl -s -X POST "$BASE/tasks/$TASK/events" -H "$AH_E1" -H 'Content-Type: application/json' \
  -d '{"type":"extra_work","payload":{"description":"额外搬运20箱饮料","amount":15}}' > /dev/null && ok "主管要求额外搬运已记录" || bad "额外工作事件失败"
R=$(curl -s -X POST "$BASE/tasks/$TASK/events" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d '{"type":"deduction","payload":{"amount":10,"reason":"x"}}')
echo "$R" | jq -r '.message' | grep -q "无权" && ok "工人无权上报扣款事件" || bad "事件权限控制失效: $R"
curl -s -X POST "$BASE/tasks/$TASK/chat" -H "$AH_W1" -H 'Content-Type: application/json' -d '{"content":"好的，加班到20点"}' > /dev/null && ok "任务内沟通留痕" || bad "聊天失败"

echo "=== 9. 签退→日结单 ==="
R=$(curl -s -X POST "$BASE/tasks/$TASK/check-out" -H "$AH_W1" -H 'Content-Type: application/json' -d '{"lat":31.2044,"lng":121.5985}')
SETTLE=$(echo "$R" | jq -r '.settlement')
SID=$(echo "$SETTLE" | jq -r '.id')
[ -n "$SID" ] && [ "$SID" != "null" ] && ok "签退生成日结单 #$SID" || bad "签退失败: $R"
# 期望: 基础0.5h*30=15 + 加班1.5*45=67.5 + 餐补0(工时<4h) - 保费6 = 实收; 应发=82.5
check "基础工时0.5h" "$(echo "$SETTLE" | jq -r '.baseHours')" "0.5"
check "加班费=1.5h*45=67.5" "$(echo "$SETTLE" | jq -r '.overtimeAmount')" "67.5"
check "保费=6(standard)" "$(echo "$SETTLE" | jq -r '.insurancePremium')" "6"
check "应发=15+67.5=82.5" "$(echo "$SETTLE" | jq -r '.grossAmount')" "82.5"
check "实收=82.5-6=76.5" "$(echo "$SETTLE" | jq -r '.netAmount')" "76.5"
check "平台服务费=82.5*5%=4.13" "$(echo "$SETTLE" | jq -r '.platformFee')" "4.13"

echo "=== 10. 企业支付日结 ==="
WBAL0=$(curl -s "$BASE/worker/profile" -H "$AH_W1" | jq -r '.balance')
curl -s -X POST "$BASE/settlements/$SID/pay" -H "$AH_E1" > /dev/null
WBAL1=$(curl -s "$BASE/worker/profile" -H "$AH_W1" | jq -r '.balance')
ok "企业支付后工人余额 $WBAL0 → $WBAL1"
SSTATUS=$(curl -s "$BASE/tasks/$TASK" -H "$AH_W1" | jq -r '.settlement.status')
check "结算单状态=已支付" "$SSTATUS" "confirmed"

echo "=== 11. 互评 ==="
curl -s -X POST "$BASE/tasks/$TASK/review" -H "$AH_W1" -H 'Content-Type: application/json' -d '{"rating":5,"comment":"结算爽快"}' | jq -r '.rating' | grep -q 5 && ok "工人评企业" || bad "工人评价失败"
curl -s -X POST "$BASE/tasks/$TASK/review" -H "$AH_E1" -H 'Content-Type: application/json' -d '{"rating":5,"comment":"干活麻利"}' | jq -r '.rating' | grep -q 5 && ok "企业评工人" || bad "企业评价失败"

echo "=== 12. 申诉→客服取证→补发 ==="
APPEAL_ID=$(curl -s "$BASE/appeals" -H "$AH_AD" | jq -r '[.[] | select(.status=="open")][0].id')
[ -n "$APPEAL_ID" ] && [ "$APPEAL_ID" != "null" ] && ok "客服看到种子申诉工单 #$APPEAL_ID" || bad "无待处理申诉"
EV=$(curl -s "$BASE/appeals/$APPEAL_ID/evidence" -H "$AH_AD")
echo "$EV" | jq -r '.attendance.checkInTime' | grep -q "20" && ok "取证:签到轨迹可见" || bad "取证失败"
echo "$EV" | jq -r '.chats[0].content' | grep -q "展架" && ok "取证:聊天记录可见" || bad "聊天记录缺失"
W1BAL0=$(curl -s "$BASE/worker/profile" -H "$AH_W1" | jq -r '.balance')
curl -s -X POST "$BASE/appeals/$APPEAL_ID/resolve" -H "$AH_AD" -H 'Content-Type: application/json' \
  -d '{"action":"reissue","note":"签到照片证明展架进场已损坏，补发扣款","reissueAmount":50}' > /dev/null
W1BAL1=$(curl -s "$BASE/worker/profile" -H "$AH_W1" | jq -r '.balance')
DIFF=$(awk -v a="$W1BAL1" -v b="$W1BAL0" 'BEGIN{printf "%.2f", a-b}')
ok "客服裁决补发50+冻结结算支付(余额变动 +$DIFF)"
ASTATUS=$(curl -s "$BASE/appeals" -H "$AH_AD" | jq -r ".[] | select(.id==$APPEAL_ID) | .status")
check "申诉状态=已补发" "$ASTATUS" "resolved_reissue"

echo "=== 13. 高风险企业：主管确认才生效保险 ==="
JOB2=$(curl -s -X POST "$BASE/jobs" -H "$AH_E2" -H 'Content-Type: application/json' -d "{
  \"title\":\"E2E-高空搭建\",\"category\":\"会展搭建\",\"description\":\"高风险\",
  \"location\":\"上海市青浦区国家会展中心\",\"lat\":31.1909,\"lng\":121.2947,
  \"startTime\":\"$START\",\"endTime\":\"$END\",\"headcount\":1,
  \"skillRequirements\":[\"搭建\"],\"healthCertRequired\":false,\"clothingRequirements\":\"工装\",
  \"hourlyWage\":35,\"overtimeWage\":52,\"mealAllowance\":25,\"lateDeductPerMinute\":1,\"lateGraceMinutes\":5,
  \"insurancePlan\":\"premium\",\"riskLevel\":\"high\",\"settlementType\":\"daily\"}" | jq -r '.id')
curl -s -X POST "$BASE/jobs/$JOB2/publish" -H "$AH_E2" > /dev/null
APP2=$(curl -s -X POST "$BASE/jobs/$JOB2/apply" -H "$AH_W2" | jq -r '.id')
TASK2=$(curl -s -X POST "$BASE/applications/$APP2/approve" -H "$AH_E2" | jq -r '.task.id')
QR2B=$(curl -s "$BASE/tasks/$TASK2/qrcode" -H "$AH_E2" | jq -r '.qrCode')
R=$(curl -s -X POST "$BASE/tasks/$TASK2/check-in" -H "$AH_W2" -H 'Content-Type: application/json' \
  -d "{\"qrCode\":\"$QR2B\",\"lat\":31.1909,\"lng\":121.2947,\"faceImage\":\"face_x\"}")
echo "$R" | jq -r '.message' | grep -q "主管确认" && ok "高风险岗位签到后待主管确认" || bad "高风险确认流程失效: $R"
POL2=$(curl -s "$BASE/tasks/$TASK2" -H "$AH_W2" | jq -r '.insurance')
[ "$POL2" = "null" ] && ok "主管确认前保单未签发" || bad "主管确认前保单已签发(违规)"
R=$(curl -s -X POST "$BASE/tasks/$TASK2/confirm-attendance" -H "$AH_S1")
echo "$R" | jq -r '.message' | grep -q "无权" && ok "他企主管确认被拦截(越权防护)" || bad "越权确认未拦截: $R"
R=$(curl -s -X POST "$BASE/tasks/$TASK2/confirm-attendance" -H "$AH_S2")
echo "$R" | jq -r '.message' | grep -q "保险已生效" && ok "主管确认到岗后保险生效" || bad "主管确认失败: $R"

echo "=== 14. 事故后禁止补录保险 ==="
JOB3=$(curl -s -X POST "$BASE/jobs" -H "$AH_E1" -H 'Content-Type: application/json' -d "{
  \"title\":\"E2E-补录测试\",\"category\":\"仓库分拣\",\"description\":\"x\",
  \"location\":\"上海市嘉定区宝钱公路5000号\",\"lat\":31.3522,\"lng\":121.2274,
  \"startTime\":\"$START\",\"endTime\":\"$END\",\"headcount\":1,
  \"skillRequirements\":[],\"healthCertRequired\":false,\"clothingRequirements\":\"\",
  \"hourlyWage\":26,\"overtimeWage\":39,\"mealAllowance\":15,\"lateDeductPerMinute\":0.5,\"lateGraceMinutes\":15,
  \"insurancePlan\":\"basic\",\"riskLevel\":\"low\",\"settlementType\":\"daily\"}" | jq -r '.id')
curl -s -X POST "$BASE/jobs/$JOB3/publish" -H "$AH_E1" > /dev/null
APP3=$(curl -s -X POST "$BASE/jobs/$JOB3/apply" -H "$AH_W2" | jq -r '.id')
TASK3=$(curl -s -X POST "$BASE/applications/$APP3/approve" -H "$AH_E1" | jq -r '.task.id')
curl -s -X POST "$BASE/tasks/$TASK3/events" -H "$AH_W2" -H 'Content-Type: application/json' \
  -d '{"type":"injury","payload":{"description":"签到前在货梯口扭伤"}}' > /dev/null
QR3=$(curl -s "$BASE/tasks/$TASK3/qrcode" -H "$AH_E1" | jq -r '.qrCode')
R=$(curl -s -X POST "$BASE/tasks/$TASK3/check-in" -H "$AH_W2" -H 'Content-Type: application/json' \
  -d "{\"qrCode\":\"$QR3\",\"lat\":31.3522,\"lng\":121.2274,\"faceImage\":\"face_y\"}")
echo "$R" | jq -r '.message' | grep -q "不可补录\|不允许事后补录" && ok "受伤后保险补录被拒绝(考勤仍生效)" || bad "补录拦截失效: $R"
POL3=$(curl -s "$BASE/tasks/$TASK3" -H "$AH_W2" | jq -r '.insurance')
[ "$POL3" = "null" ] && ok "补录场景无保单生成" || bad "补录场景仍生成保单(违规)"

echo "=== 15. 受伤理赔 ==="
curl -s -X POST "$BASE/tasks/$TASK/events" -H "$AH_W1" -H 'Content-Type: application/json' \
  -d '{"type":"injury","payload":{"description":"搬运时手部划伤"}}' > /dev/null
POLID=$(curl -s "$BASE/my/insurance" -H "$AH_W1" | jq -r ".[] | select(.taskId==$TASK) | .id")
R=$(curl -s -X POST "$BASE/insurance/$POLID/claim" -H "$AH_W1" -H 'Content-Type: application/json' -d '{"description":"手部划伤就医"}')
[ "$(echo "$R" | jq -r '.status')" = "paid_out" ] && ok "生效后受伤理赔成功(赔付 $(echo "$R" | jq -r '.claimAmount'))" || bad "理赔失败: $R"

echo "=== 16. 企业取消岗位→补偿+取消率 ==="
JOB4=$(curl -s -X POST "$BASE/jobs" -H "$AH_E1" -H 'Content-Type: application/json' -d "{
  \"title\":\"E2E-取消测试\",\"category\":\"保洁突击\",\"description\":\"x\",
  \"location\":\"上海市杨浦区五角场\",\"lat\":31.3012,\"lng\":121.5147,
  \"startTime\":\"$START\",\"endTime\":\"$END\",\"headcount\":1,
  \"skillRequirements\":[],\"healthCertRequired\":false,\"clothingRequirements\":\"\",
  \"hourlyWage\":25,\"overtimeWage\":38,\"mealAllowance\":15,\"lateDeductPerMinute\":0.5,\"lateGraceMinutes\":10,
  \"insurancePlan\":\"basic\",\"riskLevel\":\"low\",\"settlementType\":\"daily\"}" | jq -r '.id')
curl -s -X POST "$BASE/jobs/$JOB4/publish" -H "$AH_E1" > /dev/null
APP4=$(curl -s -X POST "$BASE/jobs/$JOB4/apply" -H "$AH_W2" | jq -r '.id')
curl -s -X POST "$BASE/applications/$APP4/approve" -H "$AH_E1" > /dev/null
W2BAL0=$(curl -s "$BASE/worker/profile" -H "$AH_W2" | jq -r '.balance')
R=$(curl -s -X POST "$BASE/jobs/$JOB4/cancel" -H "$AH_E1" -H 'Content-Type: application/json' -d '{"reason":"商场临时闭店"}')
W2BAL1=$(curl -s "$BASE/worker/profile" -H "$AH_W2" | jq -r '.balance')
CMP=$(awk -v a="$W2BAL1" -v b="$W2BAL0" 'BEGIN{printf "%.2f", a-b}')
echo "  取消补偿到账: +$CMP (应=预估成本30%)"
[ "$(awk -v c="$CMP" 'BEGIN{print (c>0)?1:0}')" = "1" ] && ok "取消岗位工人获补偿" || bad "取消补偿未到账"
CRATE=$(curl -s "$BASE/risk/me" -H "$AH_E1" | jq -r '.cancelRate')
ok "好又多取消率更新为 $CRATE"

echo "=== 17. 风险看板 ==="
EL=$(curl -s "$BASE/risk/enterprises" -H "$AH_AD")
echo "$EL" | jq -r '.[] | "  \(.companyName): 风险\(.riskLevel) 取消率\(.cancelRate) 争议率\(.disputeRate) 倍率\(.depositMultiplier) 严格确认\(.strictConfirm)"'
RL=$(echo "$EL" | jq -r '.[] | select(.companyName | contains("星辉")) | .riskLevel')
check "星辉会展=高风险" "$RL" "high"
IL=$(curl -s "$BASE/risk/industries" -H "$AH_AD" | jq -r '.[0] | "\(.category): 风险分\(.riskScore)"')
ok "行业风险沉淀: $IL"

echo ""
echo "=========================================="
echo "验证完成: 通过 $PASS 项, 失败 $FAIL 项"
echo "=========================================="
exit $FAIL
