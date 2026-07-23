export const BREAKTHROUGH_REWARDS = Object.freeze({
  learn: 28,
  act: 32,
  observe: 22,
  projection: 32,
  share: 10,
})

function questDone(state, id) {
  return Boolean(state.quests?.find((quest) => quest.id === id)?.completed)
}

export function getLocalDateKey(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function applySharePracticeReward(state, dateKey = getLocalDateKey()) {
  if (state.shareRewardDate === dateKey) return { state, rewarded: false }
  return {
    rewarded: true,
    state: {
      ...state,
      shareRewardDate: dateKey,
      xp: state.xp + BREAKTHROUGH_REWARDS.share,
      merit: state.merit + 2,
    },
  }
}

export function getBreakthroughGuide(state, requirement, dateKey = getLocalDateKey()) {
  const deficit = Math.max(0, requirement - state.xp)
  const learnDone = questDone(state, 'learn')
  const actDone = questDone(state, 'act')
  const observeDone = questDone(state, 'observe')
  const pendingProjection = state.projections?.find((projection) => !projection.completed)
  const shareClaimed = state.shareRewardDate === dateKey
  const routes = [
    {
      id: 'learn',
      action: learnDone ? 'library' : 'learn',
      title: learnDone ? '万卷灵炉' : '今日经修',
      label: learnDone ? '再炼一卷' : '读一段经文',
      detail: learnDone
        ? `每炼成一卷 +${BREAKTHROUGH_REWARDS.learn} 修为，原典与译文永久免费。`
        : '读懂一句人话，投入灵炉，完成今天的第一修。',
      reward: BREAKTHROUGH_REWARDS.learn,
      minutes: 3,
      ready: !learnDone || state.energy > 0,
      status: learnDone && state.energy < 1 ? '需 1 命火开炉' : `+${BREAKTHROUGH_REWARDS.learn} 修为`,
      repeatable: learnDone,
    },
    {
      id: 'act',
      action: actDone ? 'mirror' : 'act',
      title: pendingProjection ? '现实显化' : '现实试炼',
      label: pendingProjection ? pendingProjection.title : actDone ? '再接一道神通' : '完成一个小动作',
      detail: pendingProjection
        ? pendingProjection.action
        : actDone
          ? '去镜门接住下一道行动；已有投影完成后会立即结算。'
          : '进入现实场景，只做一个能被看见的动作。',
      reward: BREAKTHROUGH_REWARDS.act,
      minutes: 5,
      ready: !actDone || Boolean(pendingProjection),
      status: !actDone || pendingProjection ? `+${BREAKTHROUGH_REWARDS.act} 修为 · +1 命火` : '先去镜门生成投影',
      repeatable: false,
    },
    {
      id: 'observe',
      action: 'observe',
      title: '心境抉择',
      label: observeDone ? '今日已经照见' : '选一次真实走法',
      detail: observeDone ? '这条今日修行已完成，明日会出现新的心境。' : '看场景、做选择，再听超我把后果讲明白。',
      reward: BREAKTHROUGH_REWARDS.observe,
      minutes: 2,
      ready: !observeDone,
      status: observeDone ? '今日已完成' : `+${BREAKTHROUGH_REWARDS.observe} 修为`,
      repeatable: false,
    },
    {
      id: 'share',
      action: 'share',
      title: '同行发愿',
      label: shareClaimed ? '今日共修已结算' : '发出一封同行邀请',
      detail: shareClaimed
        ? '真实好友归因仍需服务端核验；今天的分享修行不会重复奖励。'
        : '成功分享或复制专属邀请文案，获得一次今日共修奖励。',
      reward: BREAKTHROUGH_REWARDS.share,
      minutes: 1,
      ready: !shareClaimed,
      status: shareClaimed ? '今日已领取' : `今日一次 · +${BREAKTHROUGH_REWARDS.share} 修为`,
      repeatable: false,
    },
  ]

  const recommended = []
  let projected = 0
  let availableEnergy = Math.max(0, state.energy || 0)
  const add = (route, label = route.label) => {
    recommended.push({ action: route.action, label, reward: route.reward })
    projected += route.reward
    if (route.action === 'act' || route.action === 'mirror') availableEnergy += 1
    if (route.action === 'library') availableEnergy = Math.max(0, availableEnergy - 1)
  }

  const actRoute = routes.find((route) => route.id === 'act')
  const learnRoute = routes.find((route) => route.id === 'learn')
  const observeRoute = routes.find((route) => route.id === 'observe')
  const shareRoute = routes.find((route) => route.id === 'share')

  if (actRoute.ready && projected < deficit) add(actRoute)
  if (projected < deficit && (learnRoute.action === 'learn' || availableEnergy > 0)) add(learnRoute)
  if (observeRoute.ready && projected < deficit) add(observeRoute)
  if (shareRoute.ready && projected < deficit) add(shareRoute)

  const repeatRuns = Math.ceil(Math.max(0, deficit - projected) / BREAKTHROUGH_REWARDS.learn)
  if (repeatRuns > availableEnergy) {
    const missingEnergy = repeatRuns - availableEnergy
    add({ action: 'shop', reward: 0 }, `先补足 ${missingEnergy} 点命火`)
    availableEnergy += missingEnergy
  }
  for (let index = 0; index < repeatRuns; index += 1) {
    add({ action: 'library', reward: BREAKTHROUGH_REWARDS.learn }, '万卷灵炉再炼一卷')
  }

  return {
    current: state.xp,
    requirement,
    deficit,
    percent: requirement > 0 ? Math.min(100, Math.round((state.xp / requirement) * 100)) : 100,
    routes,
    recommended,
    projected,
    primaryAction: recommended[0]?.action || 'library',
    primaryLabel: recommended[0]?.label || '去万卷灵炉炼法',
  }
}
