import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

// ==================== 常量配置 ====================
const TABS = ["记录", "数据趋势", "个人设置"];
const TAB_ICONS = { 记录: "📝", 数据趋势: "📈", 个人设置: "⚙️" };
const TREND_RANGES = ["今日", "本周", "本月", "本年", "近7天"];
const STORAGE_KEY = "mydrink-records-v1";
const SETTINGS_KEY = "mydrink-settings-v1";
const PROFILE_KEY = "mydrink-profile-v1";
const DRINK_TYPES = ["咖啡", "奶茶", "酒", "水"];

// 杯型与咖啡因系数（中杯0.8，大杯1.0，超大杯1.2）
const CUP_SIZES = ["中杯", "大杯", "超大杯"];
const CAFFEINE_BASE = { 咖啡: 95, 奶茶: 45 }; // 大杯基准值
const CUP_MULTIPLIER = { 中杯: 1.0, 大杯: 1.2, 超大杯: 1.3 };

// 冰度/糖度选项
const ICE_OPTIONS = ["去冰", "少冰", "正常冰"];
const SUGAR_OPTIONS = ["无糖", "微糖", "半糖", "全糖"];

// 酒冰度
const ALCOHOL_ICE_OPTIONS = ["加冰", "不加冰"];

// 水冷暖
const WATER_TEMP_OPTIONS = ["热水", "凉白开"];

// 默认值
const DEFAULT_ALCOHOL_MG = 14000; // 14g = 14000mg
const DEFAULT_WATER_ML = 500;

// 每小时时段
const HOURS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

// 颜色常量
const COLORS = {
  primary: "#b08968",
  primaryLight: "rgba(176, 137, 104, 0.4)",
  border: "#9c7a5f",
  textDark: "#3C281E",
  pie: {
    咖啡: "#9c7a5f",
    奶茶: "#b08968",
    酒: "#ffc02e",
    水: "#90ccfb"
  }
};

const PIE_COLORS = COLORS.pie;

// ==================== 辅助函数 ====================
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const dateToKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const safeDate = (input) => {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const getWeekDays = (baseDate) => {
  const day = baseDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return d;
  });
};

const getLast7Days = (baseDate) =>
  Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(baseDate.getDate() - (6 - idx));
    return d;
  });

const getMonthDays = (baseDate) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, idx) => {
    const d = new Date(year, month, idx + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
};

const getYearMonths = (baseDate) =>
  Array.from({ length: 12 }, (_, idx) => new Date(baseDate.getFullYear(), idx, 1));

const getDateRangeForTrend = (range, today) => {
  switch (range) {
    case "今日":
      return [today];
    case "本周":
      return getWeekDays(today);
    case "近7天":
      return getLast7Days(today);
    case "本月":
      return getMonthDays(today);
    case "本年":
      return getYearMonths(today);
    default:
      return [];
  }
};

const getFilteredRecordsForTrend = (records, range, today) => {
  const dateRange = getDateRangeForTrend(range, today);
  if (range === "今日") {
    return records.filter((r) => isSameDay(r._date, today));
  }
  if (range === "本周" || range === "近7天" || range === "本月") {
    return records.filter((r) => dateRange.some((d) => isSameDay(d, r._date)));
  }
  if (range === "本年") {
    return records.filter((r) => r._date.getFullYear() === today.getFullYear());
  }
  return records;
};

const getTrendChartData = (records, range, today, field = 'caffeine') => {
  const dateRange = getDateRangeForTrend(range, today);
  if (range === "今日") {
    const data = HOURS.map((hour) => ({ time: hour, [field]: 0 }));
    records.forEach((r) => {
      const h = Number(r.time.split(":")[0]);
      const slotIdx = data.findIndex((d) => Number(d.time.split(":")[0]) >= h);
      const idx = slotIdx === -1 ? data.length - 1 : slotIdx;
      data[idx][field] += r[field];
    });
    let cumulative = 0;
    return data.map((d) => {
      cumulative += d[field];
      return { ...d, cumulative };
    });
  }

  const data = dateRange.map((d) => ({
    time: range === "本年" ? `${d.getMonth() + 1}月` : `${d.getMonth() + 1}/${d.getDate()}`,
    [field]: 0
  }));

  records.forEach((r) => {
    let idx = -1;
    if (range === "本年") {
      idx = dateRange.findIndex((d) => d.getMonth() === r._date.getMonth());
    } else {
      idx = dateRange.findIndex((d) => isSameDay(d, r._date));
    }
    if (idx >= 0) data[idx][field] += r[field];
  });

  return data.map((d) => ({ ...d, cumulative: d[field] }));
};

// ==================== 健康助手组件（增强版） ====================
const HealthAssistant = ({
  todayRecords,
  userWeight,
  userGender,
  dailyWaterTarget,
  totalWater,
  userAge,
  userBloodSugar
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 每分钟更新一次时间
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 计算咖啡因剩余量（半衰期 5 小时）
  const caffeineRemaining = useMemo(() => {
    let remaining = 0;
    todayRecords.forEach(record => {
      if (record.type === "咖啡" || record.type === "奶茶") {
        const recordTime = new Date(record._date);
        const minutesDiff = (currentTime - recordTime) / (1000 * 60);
        if (minutesDiff < 0) return;
        const halfLife = 300; // 5小时 = 300分钟
        const ratio = Math.pow(0.5, minutesDiff / halfLife);
        remaining += (record.caffeine || 0) * ratio;
      }
    });
    return Math.round(remaining);
  }, [todayRecords, currentTime]);

  // 计算酒精 BAC（Widmark 公式）
  const alcoholBAC = useMemo(() => {
    if (!userWeight || userWeight <= 0) return null;
    const r = userGender === "male" ? 0.68 : (userGender === "female" ? 0.55 : 0.6);
    let totalAlcoholGrams = 0;
    let latestDrinkTime = null;
    todayRecords.forEach(record => {
      if (record.type === "酒" && record.alcohol) {
        const grams = record.alcohol / 1000; // mg -> g
        totalAlcoholGrams += grams;
        const recordTime = new Date(record._date);
        if (!latestDrinkTime || recordTime > latestDrinkTime) latestDrinkTime = recordTime;
      }
    });
    if (totalAlcoholGrams === 0) return 0;
    const hoursSinceLastDrink = latestDrinkTime ? (currentTime - latestDrinkTime) / (1000 * 3600) : 0;
    let bac = (totalAlcoholGrams / (userWeight * r)) - (0.015 * Math.max(0, hoursSinceLastDrink));
    bac = Math.max(0, bac);
    return bac;
  }, [todayRecords, currentTime, userWeight, userGender]);

  // 喝水提醒：距离上次喝水超过 90 分钟且今日未达标
  const waterReminder = useMemo(() => {
    if (totalWater >= dailyWaterTarget) return null;
    const lastWaterRecord = [...todayRecords]
      .filter(r => r.type === "水")
      .sort((a, b) => new Date(b._date) - new Date(a._date))[0];
    if (!lastWaterRecord) return "今天还没喝水，快喝一杯吧！";
    const lastWaterTime = new Date(lastWaterRecord._date);
    const minutesSinceLast = (currentTime - lastWaterTime) / (1000 * 60);
    if (minutesSinceLast > 90) {
      return `距离上次喝水已超过 90 分钟，该补充水分了！还差 ${Math.max(0, dailyWaterTarget - totalWater)} ml 达标。`;
    }
    return null;
  }, [todayRecords, currentTime, dailyWaterTarget, totalWater]);

  // 咖啡因提醒
  const caffeineMessage = useMemo(() => {
    if (caffeineRemaining === 0) return null;
    const currentHour = currentTime.getHours();
    if (currentHour >= 20 && caffeineRemaining > 50) {
      return `⚠️ 当前体内约含 ${caffeineRemaining} mg 咖啡因，可能影响睡眠，建议今晚避免再摄入。`;
    }
    return `💪 体内咖啡因剩余约 ${caffeineRemaining} mg，${caffeineRemaining > 100 ? "含量较高" : "在正常范围"}。`;
  }, [caffeineRemaining, currentTime]);

  // 酒精提醒
  const alcoholMessage = useMemo(() => {
    if (alcoholBAC === null) return null;
    if (alcoholBAC === 0) return "🍵 目前血液酒精浓度为 0，可以安全驾驶。";
    const bacPercent = (alcoholBAC * 100).toFixed(2);
    if (alcoholBAC >= 0.03) {
      return `⚠️ 血液酒精浓度约 ${bacPercent}% ，不建议驾驶。请等待代谢。`;
    }
    return `🍺 血液酒精浓度约 ${bacPercent}% ，${alcoholBAC >= 0.02 ? "建议谨慎驾驶" : "基本安全"}。`;
  }, [alcoholBAC]);

  // 个性化建议（基于年龄、体重、血糖）
  const healthAdvice = useMemo(() => {
    const advices = [];

    // 1. 饮水量建议：体重 * 30ml（一般推荐）
    if (userWeight > 0) {
      const recommendedWater = Math.round(userWeight * 30);
      advices.push(`💧 根据您的体重 ${userWeight} kg，每日建议饮水量约 ${recommendedWater} ml。`);
    } else {
      advices.push(`💧 建议在个人设置中填写体重，以便获得更精准的饮水建议。`);
    }

    // 2. 咖啡因建议（根据年龄、体重）
    if (userAge > 0) {
      if (userAge < 18) {
        advices.push(`☕️ 您年龄较小，建议每日咖啡因不超过 100 mg。`);
      } else if (userAge > 60) {
        advices.push(`☕️ 您年龄较大，建议每日咖啡因不超过 200 mg。`);
      } else {
        advices.push(`☕️ 成年人每日咖啡因建议不超过 400 mg，请根据自身感受调整。`);
      }
    } else {
      advices.push(`☕️ 可在个人设置中填写年龄，获取咖啡因摄入建议。`);
    }

    // 3. 血糖建议
    if (userBloodSugar > 0) {
      if (userBloodSugar < 3.9) {
        advices.push(`🩸 血糖偏低（${userBloodSugar} mmol/L），注意补充糖分，避免低血糖。`);
      } else if (userBloodSugar > 6.1) {
        advices.push(`🩸 血糖偏高（${userBloodSugar} mmol/L），建议减少高糖饮品，定期监测。`);
      } else {
        advices.push(`🩸 血糖在正常范围（${userBloodSugar} mmol/L），继续保持良好习惯。`);
      }
    } else {
      advices.push(`🩸 可在个人设置中填写血糖值，获取个性化建议。`);
    }

    return advices;
  }, [userWeight, userAge, userBloodSugar]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50 mb-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3">💡 健康助手</h3>

      {/* 个性化建议卡片 */}
      <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📋</span>
          <h4 className="font-medium text-slate-800">今日摄入建议</h4>
        </div>
        <ul className="space-y-1 text-sm text-slate-700">
          {healthAdvice.map((advice, idx) => (
            <li key={idx}>{advice}</li>
          ))}
        </ul>
      </div>

      {/* 血糖/体重趋势关联提示 */}
      <div className="bg-indigo-50 rounded-xl p-3 mb-4 border border-indigo-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📈</span>
          <h4 className="font-medium text-slate-800">健康趋势关联</h4>
        </div>
        <p className="text-xs text-slate-600">
          定期在「个人设置」中更新体重和血糖，系统将根据您的饮品记录分析健康趋势。
          <br />
          （后续版本将支持体重/血糖历史记录图表，敬请期待）
        </p>
      </div>

      {/* 原有的提醒部分（喝水、咖啡因、酒精） */}
      <div className="space-y-3">
        {waterReminder && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500">💧</span>
            <p className="text-slate-700">{waterReminder}</p>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <span className="text-orange-500">☕️</span>
          <p className="text-slate-700">{caffeineMessage || "今日无咖啡因摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-amber-500">🍺</span>
          <p className="text-slate-700">{alcoholMessage || "今日无酒精摄入"}</p>
        </div>
      </div>
    </div>
  );
};

// ==================== 子组件 ====================
// 记录页标签页（含滑动卡片，按钮移至第一张卡片内）
const RecordTab = ({
  totalCaffeine,
  dailyLimit,
  exceedLimit,
  totalAlcohol,
  dailyAlcoholLimit,
  exceedAlcoholLimit,
  totalWater,
  dailyWaterTarget,
  exceedWaterTarget,
  onAddDrink,
  userWeight,
  userGender,
  todayRecords,
  userAge,
  userBloodSugar
}) => {
  // 滑动容器引用和当前卡片索引
  const scrollContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const index = Math.round(scrollContainerRef.current.scrollLeft / scrollContainerRef.current.clientWidth);
      setActiveIndex(index);
    }
  };
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 点击指示点切换卡片
  const scrollToCard = (index) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  // 饮品按钮区域
  const DrinkButtons = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div className="grid grid-cols-2 gap-3">
        {/* 咖啡按钮 */}
        <button
          className="h-26 rounded-2xl border text-l font-semibold text-white shadow-md transition active:scale-95"
          style={{ backgroundColor: "rgba(176, 137, 104, 0.8)", borderColor: COLORS.border }}
          onClick={() => onAddDrink("咖啡")}
        >
          <span className="block text-2xl">☕</span>
          <span>咖啡</span>
        </button>
        {/* 奶茶按钮 */}
        <button
          className="h-26 rounded-2xl border text-l font-semibold text-white shadow-md transition active:scale-95"
          style={{ backgroundColor: "rgba(202, 147, 103, 0.7)", borderColor: "rgba(203, 142, 92)" }}
          onClick={() => onAddDrink("奶茶")}
        >
          <span className="block text-2xl">🧋</span>
          <span>奶茶</span>
        </button>
      </div>
      {/* 酒和水按钮保持不变 */}
      <button
        className="h-26 w-full rounded-2xl border text-l font-semibold text-white shadow-md transition active:scale-95"
        style={{ backgroundColor: "rgba(255, 192, 46, 0.7)", borderColor: "#e38216" }}
        onClick={() => onAddDrink("酒")}
      >
        <span className="block text-2xl">🍺</span>
        <span>酒</span>
      </button>
      <button
        className="h-26 w-full rounded-2xl border text-l font-semibold text-white shadow-md transition active:scale-95"
        style={{ backgroundColor: "rgba(144, 204, 251, 0.6)", borderColor: "#008ed5" }}
        onClick={() => onAddDrink("水")}
      >
        <span className="block text-2xl">💧</span>
        <span>水</span>
      </button>
    </div>
  );

  return (
    <section className="space-y-4">
      {/* 横向滑动卡片区域 */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex">
          {/* 卡片1：今日摄入统计 + 饮品按钮 */}
          <div className="flex-shrink-0 w-full snap-start">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
              <p className="text-sm text-slate-500">☕️ 今天已摄入咖啡因</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalCaffeine} mg</p>
              <p className={`mt-1 text-xs ${exceedLimit ? "text-rose-600" : "text-slate-500"}`}>
                每日咖啡因上限 {dailyLimit} mg {exceedLimit ? "（已超出）" : ""}
              </p>
              <p className="mt-4 text-sm text-slate-500">🍺 今天已摄入酒精</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalAlcohol} mg</p>
              <p className={`mt-1 text-xs ${exceedAlcoholLimit ? "text-rose-600" : "text-slate-500"}`}>
                每日酒精上限 {dailyAlcoholLimit} mg {exceedAlcoholLimit ? "（已超出）" : ""}
              </p>
              <p className="mt-4 text-sm text-slate-500">💧 今天已摄入水分</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalWater} ml</p>
              <p className={`mt-1 text-xs ${exceedWaterTarget ? "text-green-600" : "text-slate-500"}`}>
                每日喝水目标 {dailyWaterTarget} ml {exceedWaterTarget ? "（已达成）" : `（还差 ${Math.max(0, dailyWaterTarget - totalWater)} ml）`}
              </p>

              {/* 饮品按钮区域 */}
              <div className="mt-6">
                <DrinkButtons />
              </div>
            </div>
          </div>

          {/* 卡片2：健康助手 */}
          <div className="flex-shrink-0 w-full snap-start px-2">
            <HealthAssistant
              todayRecords={todayRecords}
              userWeight={userWeight}
              userGender={userGender}
              dailyWaterTarget={dailyWaterTarget}
              totalWater={totalWater}
              userAge={userAge}
              userBloodSugar={userBloodSugar}
            />
          </div>
        </div>
      </div>

      {/* 页面指示点 */}
      <div className="flex justify-center gap-2">
        {[0, 1].map(idx => (
          <button
            key={idx}
            onClick={() => scrollToCard(idx)}
            className={`h-2 rounded-full transition-all ${
              activeIndex === idx ? "w-4 bg-[#3C281E]" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

// 数据趋势标签页（咖啡因/酒精/水分趋势左右滑动切换）
const TrendTab = ({
  normalizedRecords,   // 所有标准化的记录
  today,               // 当前日期
  records,             // 记录列表显示的数据（筛选后）
  filterDate,
  setFilterDate,
  onEdit,
  onDelete
}) => {
  // 各指标独立范围状态
  const [caffeineRange, setCaffeineRange] = useState("今日");
  const [alcoholRange, setAlcoholRange] = useState("今日");
  const [waterRange, setWaterRange] = useState("今日");

  // 计算各指标趋势数据
  const caffeineChartData = useMemo(
    () => getTrendChartData(normalizedRecords, caffeineRange, today, 'caffeine'),
    [normalizedRecords, caffeineRange, today]
  );
  const alcoholChartData = useMemo(
    () => getTrendChartData(normalizedRecords, alcoholRange, today, 'alcohol'),
    [normalizedRecords, alcoholRange, today]
  );
  const waterChartData = useMemo(
    () => getTrendChartData(normalizedRecords, waterRange, today, 'water'),
    [normalizedRecords, waterRange, today]
  );

  // 饼图独立范围状态（保持不变）
  const [pieRange, setPieRange] = useState("今日");
  const pieFilteredRecords = useMemo(
    () => getFilteredRecordsForTrend(normalizedRecords, pieRange, today),
    [normalizedRecords, pieRange, today]
  );
  const pieData = useMemo(() => {
    return DRINK_TYPES.map((type) => ({
      name: type,
      value: pieFilteredRecords.filter((r) => r.type === type).length
    }));
  }, [pieFilteredRecords]);

  // 饼图过滤掉数量为0的项
  const filteredPieData = pieData.filter(item => item.value > 0);
  const totalCount = filteredPieData.reduce((sum, d) => sum + d.value, 0);

  // 饼图自定义标签（略，与原一致）
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const midRadius = outerRadius + 20;
    const horizontalOffset = 15;
    const midX = cx + midRadius * Math.cos(-midAngle * RADIAN);
    const midY = cy + midRadius * Math.sin(-midAngle * RADIAN);
    const isRight = midX > cx;
    const textX = midX + (isRight ? horizontalOffset : -horizontalOffset);
    const textY = midY;
    const elbowX = textX;
    const elbowY = midY;
    const startX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
    const startY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
    const percentValue = (percent * 100).toFixed(0);
    const textAnchor = isRight ? "start" : "end";

    return (
      <g>
        <path
          d={`M${startX},${startY} L${midX},${midY} L${elbowX},${elbowY}`}
          stroke="#9ca3af"
          fill="none"
          strokeWidth={1}
        />
        <text
          x={textX}
          y={textY}
          fill="#374151"
          fontSize={11}
          textAnchor={textAnchor}
          dominantBaseline="middle"
        >
          {`${name} ${percentValue}%`}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = totalCount === 0 ? 0 : ((value / totalCount) * 100).toFixed(1);
      return (
        <div className="rounded-lg bg-white p-2 shadow-md border border-slate-200 text-sm">
          <p className="font-medium text-slate-800">{name}</p>
          <p className="text-slate-600">{value} 杯 ({percent}%)</p>
        </div>
      );
    }
    return null;
  };

  const getPieTitle = () => {
    switch (pieRange) {
      case "今日": return "今日饮品占比";
      case "本周": return "本周饮品占比";
      case "本月": return "本月饮品占比";
      case "本年": return "本年饮品占比";
      case "近7天": return "近7天饮品占比";
      default: return "饮品占比";
    }
  };

  // 趋势卡片滑动容器
  const scrollContainerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const index = Math.round(scrollContainerRef.current.scrollLeft / scrollContainerRef.current.clientWidth);
      setActiveIndex(index);
    }
  };
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 趋势卡片通用渲染函数
  const renderTrendCard = (title, unit, chartData, range, setRange, fieldColor = COLORS.primary) => {
    return (
      <div className="flex-shrink-0 w-full snap-start">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800 flex-shrink-0">
              📊 {title}趋势
            </h2>
            <div className="flex-1 min-w-0 overflow-x-auto rounded-lg bg-slate-100 p-1">
              <div className="flex gap-1">
                {TREND_RANGES.map((r) => (
                  <button
                    key={r}
                    className={`rounded-md px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 ${
                      range === r ? "bg-white text-[#3C281E] shadow-sm" : "text-slate-500"
                    }`}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={fieldColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={fieldColor} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={fieldColor}
                  fillOpacity={1}
                  fill={`url(#gradient-${title})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      {/* 饮品占比饼图（独立范围控制） */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-800 flex-shrink-0">🥤 {getPieTitle()}</h2>
          <div className="flex-1 min-w-0 overflow-x-auto rounded-lg bg-slate-100 p-1">
            <div className="flex gap-1">
              {TREND_RANGES.map((range) => (
                <button
                  key={range}
                  className={`rounded-md px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 ${
                    pieRange === range ? "bg-white text-[#3C281E] shadow-sm" : "text-slate-500"
                  }`}
                  onClick={() => setPieRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ height: "280px" }}>
          {filteredPieData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              暂无数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredPieData}
                  dataKey="value"
                  cx="50%"
                  cy="45%"
                  innerRadius={40}
                  outerRadius={60}
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  {filteredPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || "#818cf8"} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  margin={{ top: 20 }}
                  wrapperStyle={{ marginTop: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 趋势卡片滑动区域 */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex">
          {renderTrendCard("咖啡因", "mg", caffeineChartData, caffeineRange, setCaffeineRange, COLORS.primary)}
          {renderTrendCard("酒精", "mg", alcoholChartData, alcoholRange, setAlcoholRange, "#f59e0b")}
          {renderTrendCard("水分", "ml", waterChartData, waterRange, setWaterRange, "#3b82f6")}
        </div>
      </div>
      {/* 可选：页面指示点 */}
      <div className="flex justify-center gap-2 mt-2">
        {[0, 1, 2].map(idx => (
          <div
            key={idx}
            className={`h-2 w-2 rounded-full transition-all ${
              activeIndex === idx ? "w-4 bg-[#3C281E]" : "bg-slate-300"
            }`}
          />
        ))}
      </div>

      {/* 记录列表 */}
      <RecordList
        records={records}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </section>
  );
};

// 个人设置标签页（增加性别选项）
const SettingsTab = ({
  profile,
  isEditingProfile,
  setIsEditingProfile,
  streakDays,
  recordsCount,
  coffeeCount,
  milkTeaCount,
  alcoholCount,
  waterCount,
  dailyLimit,
  setDailyLimit,
  dailyAlcoholLimit,
  setDailyAlcoholLimit,
  dailyWaterTarget,
  setDailyWaterTarget,
  onExportCsv,
  onResetAll,
  onAvatarUpload,
  setProfile
}) => {
  const [tempDailyLimit, setTempDailyLimit] = useState(String(dailyLimit));
  const [tempDailyAlcoholLimit, setTempDailyAlcoholLimit] = useState(String(dailyAlcoholLimit));
  const [tempDailyWaterTarget, setTempDailyWaterTarget] = useState(String(dailyWaterTarget));

  useEffect(() => {
    setTempDailyLimit(String(dailyLimit));
  }, [dailyLimit]);

  useEffect(() => {
    setTempDailyAlcoholLimit(String(dailyAlcoholLimit));
  }, [dailyAlcoholLimit]);

  useEffect(() => {
    setTempDailyWaterTarget(String(dailyWaterTarget));
  }, [dailyWaterTarget]);

  const handleDailyLimitBlur = () => {
    let val = tempDailyLimit.trim();
    if (val === "") {
      setTempDailyLimit(String(dailyLimit));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailyLimit(String(dailyLimit));
      return;
    }
    num = Math.min(800, Math.max(50, num));
    setDailyLimit(num);
    setTempDailyLimit(String(num));
  };

  const handleDailyAlcoholLimitBlur = () => {
    let val = tempDailyAlcoholLimit.trim();
    if (val === "") {
      setTempDailyAlcoholLimit(String(dailyAlcoholLimit));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailyAlcoholLimit(String(dailyAlcoholLimit));
      return;
    }
    num = Math.min(50000, Math.max(0, num));
    setDailyAlcoholLimit(num);
    setTempDailyAlcoholLimit(String(num));
  };

  const handleDailyWaterTargetBlur = () => {
    let val = tempDailyWaterTarget.trim();
    if (val === "") {
      setTempDailyWaterTarget(String(dailyWaterTarget));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailyWaterTarget(String(dailyWaterTarget));
      return;
    }
    num = Math.min(5000, Math.max(0, num));
    setDailyWaterTarget(num);
    setTempDailyWaterTarget(String(num));
  };

  // 性别选项
  const genderOptions = ["未设置", "男", "女"];
  const handleGenderChange = (gender) => {
    setProfile(prev => ({ ...prev, gender }));
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">👤 个人信息</h2>
          <button
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
            onClick={() => setIsEditingProfile((v) => !v)}
          >
            {isEditingProfile ? "完成" : "编辑"}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          {String(profile.avatar || "").startsWith("data:image") ? (
            <img
              src={profile.avatar}
              alt="avatar"
              className="h-12 w-12 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(176,137,104,0.4)] text-lg font-semibold text-[#3C281E]">
              {profile.avatar || "Y"}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">{profile.nickname || "未命名用户"}</p>
            {profile.bio ? <p className="text-xs text-slate-500">{profile.bio}</p> : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">已连续记录 {streakDays} 天</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
          {Number(profile.age) > 0 ? <span>年龄：{profile.age}</span> : null}
          {Number(profile.weight) > 0 ? <span>体重：{profile.weight} kg</span> : null}
          {Number(profile.bloodSugar) > 0 ? <span>血糖：{profile.bloodSugar} mmol/L</span> : null}
          {profile.gender && profile.gender !== "未设置" ? <span>性别：{profile.gender}</span> : null}
        </div>

        {isEditingProfile && (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
            <ProfileEditor
              profile={profile}
              setProfile={setProfile}
              onAvatarUpload={onAvatarUpload}
            />
            {/* 性别选择 */}
            <div>
              <label className="block text-xs text-slate-600 mb-1">性别</label>
              <div className="flex gap-2">
                {genderOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleGenderChange(opt)}
                    className={`flex-1 py-2 rounded-lg border text-sm ${
                      profile.gender === opt
                        ? "bg-[#b08968] text-white border-[#9c7a5f]"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-base font-semibold text-slate-800">{recordsCount}</p>
            <p className="text-xs text-slate-500">总杯数</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-base font-semibold text-slate-800">{coffeeCount}</p>
            <p className="text-xs text-slate-500">咖啡</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-base font-semibold text-slate-800">{milkTeaCount}</p>
            <p className="text-xs text-slate-500">奶茶</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-base font-semibold text-slate-800">{alcoholCount}</p>
            <p className="text-xs text-slate-500">酒</p>
          </div>
          <div className="rounded-lg bg-slate-50 py-2">
            <p className="text-base font-semibold text-slate-800">{waterCount}</p>
            <p className="text-xs text-slate-500">水</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
        <h2 className="text-base font-semibold text-slate-800">⚙️ 个人设置</h2>
        <p className="mt-2 text-xs text-slate-500">设置每日摄入咖啡因、酒精上限和喝水目标。</p>
        <label className="mt-4 block text-sm text-slate-600">
          每日咖啡因上限（mg）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailyLimit}
            onChange={(e) => setTempDailyLimit(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailyLimitBlur}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-600">
          每日酒精上限（mg）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailyAlcoholLimit}
            onChange={(e) => setTempDailyAlcoholLimit(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailyAlcoholLimitBlur}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-600">
          每日喝水目标（ml）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailyWaterTarget}
            onChange={(e) => setTempDailyWaterTarget(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailyWaterTargetBlur}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <button
          className="w-full rounded-xl py-2 text-sm text-white active:scale-95 transition-transform"
          style={{
            backgroundColor: COLORS.primaryLight,
            borderColor: COLORS.border,
            borderWidth: "1px",
            borderStyle: "solid",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            color: COLORS.textDark
          }}
          onClick={onExportCsv}
        >
          📤 导出 CSV 记录
        </button>
        <button
          className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm text-rose-600 active:scale-95 transition-transform"
          onClick={() => {
            if (window.confirm(`确定要清空所有记录吗？共 ${recordsCount} 条记录，此操作不可恢复。`)) {
              onResetAll();
            }
          }}
        >
          🧹 清空所有记录
        </button>
      </div>
    </section>
  );
};

const ProfileEditor = ({ profile, setProfile, onAvatarUpload }) => (
  <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
    <label className="block text-xs text-slate-600">
      头像 Emoji/字符（例如 😀、A、D）
      <input
        value={profile.avatar}
        onChange={(e) => setProfile((prev) => ({ ...prev, avatar: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
    <label className="block text-xs text-slate-600">
      上传头像照片
      <input
        type="file"
        accept="image/*"
        onChange={onAvatarUpload}
        className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[rgba(176,137,104,0.4)] file:px-3 file:py-2 file:text-xs file:text-[#3C281E]"
      />
    </label>
    <label className="block text-xs text-slate-600">
      昵称
      <input
        value={profile.nickname}
        onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
    <label className="block text-xs text-slate-600">
      年龄
      <input
        type="number"
        min="0"
        max="120"
        value={profile.age}
        onChange={(e) =>
          setProfile((prev) => ({
            ...prev,
            age: e.target.value === "" || Number(e.target.value) === 0 ? "" : Math.max(0, Number(e.target.value))
          }))
        }
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
    <label className="block text-xs text-slate-600">
      体重（kg）
      <input
        type="number"
        min="0"
        max="300"
        step="0.1"
        value={profile.weight ?? ""}
        onChange={(e) =>
          setProfile((prev) => ({
            ...prev,
            weight: e.target.value === "" || Number(e.target.value) === 0 ? "" : Math.max(0, Number(e.target.value))
          }))
        }
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
    <label className="block text-xs text-slate-600">
      血糖（mmol/L）
      <input
        type="number"
        min="0"
        max="30"
        step="0.1"
        value={profile.bloodSugar ?? ""}
        onChange={(e) =>
          setProfile((prev) => ({
            ...prev,
            bloodSugar: e.target.value === "" || Number(e.target.value) === 0 ? "" : Math.max(0, Number(e.target.value))
          }))
        }
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
    <label className="block text-xs text-slate-600">
      个人简介
      <input
        value={profile.bio || ""}
        onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
      />
    </label>
  </div>
);

const RecordList = ({ records, filterDate, setFilterDate, onEdit, onDelete }) => {
  const inputRef = useRef(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_DISPLAY_LIMIT = 3;

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  useEffect(() => {
    setShowAll(false);
  }, [filterDate]);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.showPicker) {
        inputRef.current.showPicker();
      }
    }
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b._date) - new Date(a._date));
  const shouldLimit = !filterDate && !showAll;
  const displayedRecords = shouldLimit ? sortedRecords.slice(0, DEFAULT_DISPLAY_LIMIT) : sortedRecords;
  const hasMore = sortedRecords.length > DEFAULT_DISPLAY_LIMIT;

  const baseStyle = {
    appearance: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    display: "block"
  };

  const iosStyle = isIOS ? {
    lineHeight: "1.5",
    paddingTop: "8px",
    paddingBottom: "8px",
    height: "auto"
  } : {
    height: "40px",
    lineHeight: "24px"
  };

  const getValueDisplay = (record) => {
    if (record.type === "咖啡" || record.type === "奶茶") {
      return `${record.caffeine} mg`;
    }
    if (record.type === "酒") {
      return `${record.alcohol} mg`;
    }
    if (record.type === "水") {
      return `${record.water} ml`;
    }
    return "";
  };

  const getDetails = (record) => {
    if (record.type === "咖啡" || record.type === "奶茶") {
      return `${record.cupSize || "大杯"} · ${record.ice || "正常冰"} · ${record.sugar || "半糖"}`;
    }
    if (record.type === "酒") {
      return `${record.alcoholIce || "加冰"} · ${record.alcohol} mg`;
    }
    if (record.type === "水") {
      return `${record.waterTemp || "凉白开"} · ${record.water} ml`;
    }
    return "";
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">📚记录列表</h2>
        <button
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
          onClick={() => setFilterDate("")}
        >
          清除筛选
        </button>
      </div>
      <div
        className="relative mb-3 w-full cursor-pointer"
        onClick={handleContainerClick}
      >
        <input
          ref={inputRef}
          type="date"
          value={filterDate}
          placeholder={isIOS ? undefined : "年/月/日"}
          onChange={(e) => setFilterDate(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-indigo-200 focus:ring"
          style={{
            ...baseStyle,
            ...iosStyle,
            color: filterDate ? "inherit" : (isIOS ? "transparent" : "inherit")
          }}
        />
        {isIOS && !filterDate && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" style={{ lineHeight: "24px" }}>
            年/月/日
          </span>
        )}
      </div>

      {displayedRecords.length === 0 ? (
        <p className="text-sm text-slate-500">当前筛选下没有记录。</p>
      ) : (
        <>
          <ul className="space-y-2">
            {displayedRecords.map((r) => (
              <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-700">
                      {r.type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getDetails(r)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateToKey(r._date)} {r.time}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#3C281E]">{getValueDisplay(r)}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                    onClick={() => onEdit(r)}
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600"
                    onClick={() => onDelete(r.id)}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && shouldLimit && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              加载更多 ({sortedRecords.length - DEFAULT_DISPLAY_LIMIT} 条)
            </button>
          )}
          {!shouldLimit && !filterDate && hasMore && (
            <button
              onClick={() => setShowAll(false)}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              收起 (显示最近 {DEFAULT_DISPLAY_LIMIT} 条)
            </button>
          )}
        </>
      )}
    </div>
  );
};

const PickerModal = ({
  open,
  type,
  ice,
  sugar,
  time,
  date,
  cupSize,
  alcoholIce,
  waterTemp,
  customAmount,
  onClose,
  onConfirm,
  onTypeChange,
  onIceChange,
  onSugarChange,
  onTimeChange,
  onDateChange,
  onCupSizeChange,
  onAlcoholIceChange,
  onWaterTempChange,
  onCustomAmountChange
}) => {
  // iOS 检测
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  if (!open) return null;

  const isCoffeeOrMilk = type === "咖啡" || type === "奶茶";
  const isAlcohol = type === "酒";
  const isWater = type === "水";

  const getAmountDefault = () => {
    if (isAlcohol) return String(DEFAULT_ALCOHOL_MG);
    if (isWater) return String(DEFAULT_WATER_ML);
    return "";
  };

  const currentAmount = customAmount !== undefined ? customAmount : getAmountDefault();

  // 基础样式（非 iOS 固定高度，iOS 自适应高度）
  const baseInputStyle = {
    appearance: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    display: "block"
  };

  const iosInputStyle = isIOS ? {
    lineHeight: "1.5",
    paddingTop: "8px",
    paddingBottom: "8px",
    height: "auto"
  } : {
    height: "40px",
    lineHeight: "24px"
  };

  const inputClassName = "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-indigo-200 focus:ring";

  // 日期选择器点击处理（用于 iOS 模拟）
  const handleDateClick = (e) => {
    e.stopPropagation();
    const input = e.currentTarget.querySelector('input');
    if (input) {
      input.focus();
      if (input.showPicker) {
        input.showPicker();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-white/45" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl space-y-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-slate-800">选择饮品参数</h3>

        {/* 饮品类型 */}
        <div>
          <p className="mb-2 text-sm text-slate-600">饮品类型</p>
          <div className="flex gap-2">
            {DRINK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={`flex-1 py-2 rounded-xl border text-sm transition ${
                  type === t ? "text-[#3C281E]" : "text-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 咖啡/奶茶选项 */}
        {isCoffeeOrMilk && (
          <>
            <div>
              <p className="mb-2 text-sm text-slate-600">杯型</p>
              <div className="flex gap-2">
                {CUP_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => onCupSizeChange(s)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      cupSize === s ? "text-[#3C281E]" : "text-slate-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">冰度</p>
              <div className="flex gap-2">
                {ICE_OPTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => onIceChange(i)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      ice === i ? "text-[#3C281E]" : "text-slate-500"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">糖度</p>
              <div className="flex gap-2">
                {SUGAR_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSugarChange(s)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      sugar === s ? "text-[#3C281E]" : "text-slate-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 酒选项 */}
        {isAlcohol && (
          <>
            <div>
              <p className="mb-2 text-sm text-slate-600">冰度</p>
              <div className="flex gap-2">
                {ALCOHOL_ICE_OPTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => onAlcoholIceChange(i)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      alcoholIce === i ? "text-[#3C281E]" : "text-slate-500"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">酒精含量 (mg)</p>
              <input
                type="number"
                step="100"
                value={currentAmount}
                onChange={(e) => onCustomAmountChange(e.target.value)}
                className={inputClassName}
                style={{ ...baseInputStyle, ...iosInputStyle }}
              />
            </div>
          </>
        )}

        {/* 水选项 */}
        {isWater && (
          <>
            <div>
              <p className="mb-2 text-sm text-slate-600">冷暖</p>
              <div className="flex gap-2">
                {WATER_TEMP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => onWaterTempChange(t)}
                    className={`flex-1 py-2 rounded-xl border text-sm transition ${
                      waterTemp === t ? "text-[#3C281E]" : "text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">饮水量 (ml)</p>
              <input
                type="number"
                step="50"
                value={currentAmount}
                onChange={(e) => onCustomAmountChange(e.target.value)}
                className={inputClassName}
                style={{ ...baseInputStyle, ...iosInputStyle }}
              />
            </div>
          </>
        )}

        {/* 日期和时间（编辑时显示） */}
        {time !== undefined && (
          <>
            {/* 日期选择器（iOS 模拟占位符） */}
            <div>
              <p className="mb-2 text-sm text-slate-600">日期</p>
              <div
                className="relative w-full cursor-pointer"
                onClick={handleDateClick}
              >
                <input
                  type="date"
                  value={date}
                  onChange={(e) => onDateChange(e.target.value)}
                  placeholder={isIOS ? undefined : "年/月/日"}
                  className={inputClassName}
                  style={{
                    ...baseInputStyle,
                    ...iosInputStyle,
                    color: date ? "inherit" : (isIOS ? "transparent" : "inherit")
                  }}
                />
                {isIOS && !date && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" style={{ lineHeight: "24px" }}>
                    年/月/日
                  </span>
                )}
              </div>
            </div>
            {/* 时间选择器 */}
            <div>
              <p className="mb-2 text-sm text-slate-600">时间</p>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className={inputClassName}
                style={{ ...baseInputStyle, ...iosInputStyle }}
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-500 active:scale-95 transition">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-slate-200 text-[#3C281E] active:scale-95 transition">
            确认记录
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 主组件 ====================
function App() {
  const [activeTab, setActiveTab] = useState("记录");
  const [trendRange, setTrendRange] = useState("今日");
  const [editingId, setEditingId] = useState(null);
  const [filterDate, setFilterDate] = useState("");
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dailyLimit, setDailyLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 300;
      const parsed = JSON.parse(saved);
      return Number(parsed.dailyLimit) || 300;
    } catch {
      return 300;
    }
  });
  const [dailyAlcoholLimit, setDailyAlcoholLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 14000; // 14g = 14000mg
      const parsed = JSON.parse(saved);
      return Number(parsed.dailyAlcoholLimit) || 14000;
    } catch {
      return 14000;
    }
  });
  const [dailyWaterTarget, setDailyWaterTarget] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 2000;
      const parsed = JSON.parse(saved);
      return Number(parsed.dailyWaterTarget) || 2000;
    } catch {
      return 2000;
    }
  });
  const [pickerState, setPickerState] = useState({
    open: false,
    type: "咖啡",
    ice: ICE_OPTIONS[2],
    sugar: SUGAR_OPTIONS[2],
    cupSize: CUP_SIZES[1],
    alcoholIce: ALCOHOL_ICE_OPTIONS[0],
    waterTemp: WATER_TEMP_OPTIONS[0],
    time: "",
    customAmount: "",
    date: ""
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      avatar: "D",
      nickname: "饮品爱好者",
      age: "",
      bio: "欢迎记录你的饮品习惯",
      weight: "",
      bloodSugar: "",
      gender: "未设置"
    };
  });

  // 每次渲染时计算当前日期
  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // 标准化记录（补充缺失字段）
  const normalizedRecords = useMemo(
    () =>
      records.map((r) => ({
        ...r,
        _date: safeDate(r.createdAt || `${new Date().toDateString()} ${r.time}`),
        cupSize: r.cupSize || CUP_SIZES[1],
        waterTemp: r.waterTemp || WATER_TEMP_OPTIONS[0],
        alcoholIce: r.alcoholIce || ALCOHOL_ICE_OPTIONS[0],
        water: r.water !== undefined ? r.water : 0,
        alcohol: r.alcohol !== undefined ? r.alcohol : 0,
        caffeine: r.caffeine !== undefined ? r.caffeine : 0
      })),
    [records]
  );

  const todayRecords = useMemo(
    () => normalizedRecords.filter((r) => isSameDay(r._date, today)),
    [normalizedRecords, today]
  );

  const totalCaffeine = todayRecords.reduce((sum, r) => sum + (r.caffeine || 0), 0);
  const totalAlcohol = todayRecords.reduce((sum, r) => sum + (r.alcohol || 0), 0);
  const totalWater = todayRecords.reduce((sum, r) => sum + (r.water || 0), 0);
  const exceedLimit = totalCaffeine > dailyLimit;
  const exceedAlcoholLimit = totalAlcohol > dailyAlcoholLimit;
  const exceedWaterTarget = totalWater >= dailyWaterTarget;

  const streakDays = useMemo(() => {
    if (normalizedRecords.length === 0) return 0;
    const daySet = new Set(normalizedRecords.map((r) => dateToKey(r._date)));
    let streak = 0;
    const cursor = new Date(today);
    while (daySet.has(dateToKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [normalizedRecords, today]);

  const coffeeCount = records.filter((r) => r.type === "咖啡").length;
  const milkTeaCount = records.filter((r) => r.type === "奶茶").length;
  const alcoholCount = records.filter((r) => r.type === "酒").length;
  const waterCount = records.filter((r) => r.type === "水").length;

  const displayedRecords = useMemo(() => {
    if (!filterDate) return normalizedRecords;
    return normalizedRecords.filter((r) => dateToKey(r._date) === filterDate);
  }, [normalizedRecords, filterDate]);

  const filteredRecordsForChart = useMemo(
    () => getFilteredRecordsForTrend(normalizedRecords, trendRange, today),
    [normalizedRecords, trendRange, today]
  );

  const chartData = useMemo(
    () => getTrendChartData(filteredRecordsForChart, trendRange, today),
    [filteredRecordsForChart, trendRange, today]
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ dailyLimit, dailyAlcoholLimit, dailyWaterTarget }));
  }, [dailyLimit, dailyAlcoholLimit, dailyWaterTarget]);
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  const openPicker = useCallback((type, existingRecord = null) => {
    if (existingRecord) {
      let recordDate = "";
      if (existingRecord.createdAt) {
        recordDate = existingRecord.createdAt.split('T')[0];
      } else if (existingRecord._date) {
        recordDate = dateToKey(existingRecord._date);
      }
      setEditingId(existingRecord.id);
      setPickerState({
        open: true,
        type: existingRecord.type,
        ice: existingRecord.ice || ICE_OPTIONS[2],
        sugar: existingRecord.sugar || SUGAR_OPTIONS[2],
        cupSize: existingRecord.cupSize || CUP_SIZES[1],
        alcoholIce: existingRecord.alcoholIce || ALCOHOL_ICE_OPTIONS[0],
        waterTemp: existingRecord.waterTemp || WATER_TEMP_OPTIONS[0],
        time: existingRecord.time,
        customAmount: existingRecord.type === "酒" ? String(existingRecord.alcohol || DEFAULT_ALCOHOL_MG) :
                      existingRecord.type === "水" ? String(existingRecord.water || DEFAULT_WATER_ML) : "",
        date: recordDate
      });
    } else {
      setEditingId(null);
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const todayDate = dateToKey(now);
      setPickerState({
        open: true,
        type: type,
        ice: ICE_OPTIONS[2],
        sugar: SUGAR_OPTIONS[2],
        cupSize: CUP_SIZES[1],
        alcoholIce: ALCOHOL_ICE_OPTIONS[0],
        waterTemp: WATER_TEMP_OPTIONS[0],
        time: currentTime,
        customAmount: type === "酒" ? String(DEFAULT_ALCOHOL_MG) : (type === "水" ? String(DEFAULT_WATER_ML) : ""),
        date: todayDate
      });
    }
  }, []);

  const closePicker = useCallback(() => {
    setEditingId(null);
    setPickerState((prev) => ({ ...prev, open: false }));
  }, []);

  const addRecord = useCallback(() => {
    const now = new Date();
    let finalDate = now;
    if (pickerState.date) {
      const [year, month, day] = pickerState.date.split('-');
      finalDate = new Date(year, month-1, day, now.getHours(), now.getMinutes());
    }
    const createdAtISO = finalDate.toISOString();
    const newTime = pickerState.time || `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    if (editingId) {
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== editingId) return r;
          const base = {
            ...r,
            type: pickerState.type,
            time: newTime,
            createdAt: createdAtISO
          };
          if (pickerState.type === "咖啡" || pickerState.type === "奶茶") {
            const multiplier = CUP_MULTIPLIER[pickerState.cupSize];
            const baseCaffeine = CAFFEINE_BASE[pickerState.type];
            const caffeine = Math.round(baseCaffeine * multiplier);
            return {
              ...base,
              cupSize: pickerState.cupSize,
              ice: pickerState.ice,
              sugar: pickerState.sugar,
              caffeine,
              alcohol: 0,
              water: 0
            };
          }
          if (pickerState.type === "酒") {
            const amount = Number(pickerState.customAmount) || 0;
            return {
              ...base,
              alcoholIce: pickerState.alcoholIce,
              alcohol: amount,
              caffeine: 0,
              water: 0
            };
          }
          if (pickerState.type === "水") {
            const amount = Number(pickerState.customAmount) || 0;
            return {
              ...base,
              waterTemp: pickerState.waterTemp,
              water: amount,
              caffeine: 0,
              alcohol: 0
            };
          }
          return base;
        })
      );
    } else {
      let newRecord = {
        id: `${now.getTime()}`,
        type: pickerState.type,
        time: newTime,
        createdAt: createdAtISO
      };
      if (pickerState.type === "咖啡" || pickerState.type === "奶茶") {
        const multiplier = CUP_MULTIPLIER[pickerState.cupSize];
        const baseCaffeine = CAFFEINE_BASE[pickerState.type];
        const caffeine = Math.round(baseCaffeine * multiplier);
        newRecord = {
          ...newRecord,
          cupSize: pickerState.cupSize,
          ice: pickerState.ice,
          sugar: pickerState.sugar,
          caffeine,
          alcohol: 0,
          water: 0
        };
      } else if (pickerState.type === "酒") {
        const amount = Number(pickerState.customAmount) || 0;
        newRecord = {
          ...newRecord,
          alcoholIce: pickerState.alcoholIce,
          alcohol: amount,
          caffeine: 0,
          water: 0
        };
      } else if (pickerState.type === "水") {
        const amount = Number(pickerState.customAmount) || 0;
        newRecord = {
          ...newRecord,
          waterTemp: pickerState.waterTemp,
          water: amount,
          caffeine: 0,
          alcohol: 0
        };
      }
      setRecords((prev) => [newRecord, ...prev]);
    }
    closePicker();
  }, [editingId, pickerState, closePicker]);

  const deleteRecord = useCallback((id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setRecords([]);
    closePicker();
  }, [closePicker]);

  const exportCsv = useCallback(() => {
    const header = ["日期", "时间", "类型", "杯型", "冰度", "糖度", "酒冰度", "水冷暖", "咖啡因(mg)", "酒精(mg)", "水量(ml)"];
    const rows = normalizedRecords.map((r) => {
      return [
        dateToKey(r._date),
        r.time,
        r.type,
        r.cupSize || "",
        r.ice || "",
        r.sugar || "",
        r.alcoholIce || "",
        r.waterTemp || "",
        String(r.caffeine || 0),
        String(r.alcohol || 0),
        String(r.water || 0)
      ];
    });
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mydrink-records-${dateToKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [normalizedRecords]);

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("图片大小不能超过 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 500;
        const MAX_HEIGHT = 500;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setProfile((prev) => ({ ...prev, avatar: compressedDataUrl }));
      };
      img.onerror = () => {
        alert("图片加载失败，请尝试其他图片");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-gradient-to-b from-indigo-50 via-slate-100 to-slate-100">
      <header className="sticky top-0 z-10 border-b border-indigo-100 bg-white px-4 py-3 backdrop-blur">
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }} className="text-xl">
          MyDrink
        </h1>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        {activeTab === "记录" && (
          <RecordTab
            totalCaffeine={totalCaffeine}
            dailyLimit={dailyLimit}
            exceedLimit={exceedLimit}
            totalAlcohol={totalAlcohol}
            dailyAlcoholLimit={dailyAlcoholLimit}
            exceedAlcoholLimit={exceedAlcoholLimit}
            totalWater={totalWater}
            dailyWaterTarget={dailyWaterTarget}
            exceedWaterTarget={exceedWaterTarget}
            onAddDrink={(type) => openPicker(type)}
            userWeight={Number(profile.weight) || 0}
            userGender={profile.gender === "男" ? "male" : (profile.gender === "女" ? "female" : "unknown")}
            todayRecords={todayRecords}
            userAge={Number(profile.age) || 0}
            userBloodSugar={Number(profile.bloodSugar) || 0}
          />
        )}

        {activeTab === "数据趋势" && (
          <TrendTab
            normalizedRecords={normalizedRecords}
            today={today}
            trendRange={trendRange}
            setTrendRange={setTrendRange}
            chartData={chartData}
            records={displayedRecords}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            onEdit={(record) => openPicker(record.type, record)}
            onDelete={deleteRecord}
          />
        )}

        {activeTab === "个人设置" && (
          <SettingsTab
            profile={profile}
            isEditingProfile={isEditingProfile}
            setIsEditingProfile={setIsEditingProfile}
            streakDays={streakDays}
            recordsCount={records.length}
            coffeeCount={coffeeCount}
            milkTeaCount={milkTeaCount}
            alcoholCount={alcoholCount}
            waterCount={waterCount}
            dailyLimit={dailyLimit}
            setDailyLimit={setDailyLimit}
            dailyAlcoholLimit={dailyAlcoholLimit}
            setDailyAlcoholLimit={setDailyAlcoholLimit}
            dailyWaterTarget={dailyWaterTarget}
            setDailyWaterTarget={setDailyWaterTarget}
            onExportCsv={exportCsv}
            onResetAll={resetAll}
            onAvatarUpload={handleAvatarUpload}
            setProfile={setProfile}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-md border-t border-indigo-100 bg-white backdrop-blur">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 text-xs font-medium ${
              activeTab === tab ? "text-[#3C281E]" : "text-slate-500"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="block text-base">{TAB_ICONS[tab]}</span>
            <span>{tab}</span>
          </button>
        ))}
      </nav>

      <PickerModal
        open={pickerState.open}
        type={pickerState.type}
        ice={pickerState.ice}
        sugar={pickerState.sugar}
        cupSize={pickerState.cupSize}
        alcoholIce={pickerState.alcoholIce}
        waterTemp={pickerState.waterTemp}
        customAmount={pickerState.customAmount}
        time={pickerState.time}
        date={pickerState.date}
        onClose={closePicker}
        onConfirm={addRecord}
        onTypeChange={(type) => setPickerState((prev) => ({ ...prev, type }))}
        onIceChange={(ice) => setPickerState((prev) => ({ ...prev, ice }))}
        onSugarChange={(sugar) => setPickerState((prev) => ({ ...prev, sugar }))}
        onCupSizeChange={(cupSize) => setPickerState((prev) => ({ ...prev, cupSize }))}
        onAlcoholIceChange={(alcoholIce) => setPickerState((prev) => ({ ...prev, alcoholIce }))}
        onWaterTempChange={(waterTemp) => setPickerState((prev) => ({ ...prev, waterTemp }))}
        onTimeChange={(time) => setPickerState((prev) => ({ ...prev, time }))}
        onDateChange={(date) => setPickerState((prev) => ({ ...prev, date }))}
        onCustomAmountChange={(amount) => setPickerState((prev) => ({ ...prev, customAmount: amount }))}
      />
    </div>
  );
}

export default App;