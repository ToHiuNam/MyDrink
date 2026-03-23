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

// 杯型与系数（中杯1.0，大杯1.2，超大杯1.3）
const CUP_SIZES = ["中杯", "大杯", "超大杯"];
const CAFFEINE_BASE = { 咖啡: 95, 奶茶: 45 }; // 中杯基准值
const CUP_MULTIPLIER = { 中杯: 1.0, 大杯: 1.2, 超大杯: 1.3 };

// 糖度选项
const ICE_OPTIONS = ["去冰", "少冰", "正常冰"];
const SUGAR_OPTIONS = ["无糖", "微糖", "半糖", "全糖"];

// 糖分系数（中杯半糖基准 g）
const SUGAR_BASE = { 咖啡: 0, 奶茶: 10 };
const SUGAR_MULTIPLIER = { 无糖: 0, 微糖: 0.5, 半糖: 1.0, 全糖: 1.5 };

// 热量基准（中杯基准 kcal）
const CALORIES_BASE = { 咖啡: 5, 奶茶: 50, 酒: 7, 水: 0 };
// 脂肪基准（中杯基准 g）
const FAT_BASE = { 咖啡: 0, 奶茶: 3, 酒: 0, 水: 0 };

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
const isSameDay = (a, b) => dateToKey(a) === dateToKey(b);

const dateToKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const safeDate = (input) => {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

// 将日期归一化到当天 00:00:00
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 从 ISO 字符串提取日期部分 "YYYY-MM-DD"
const extractDateFromISO = (isoString) => {
  if (!isoString) return null;
  const match = isoString.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
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
  userBloodSugar,
  totalSugar,
  totalCalories,
  totalFat,
  dailySugarLimit,
  dailyCaloriesLimit,
  dailyFatLimit
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
        const [hours, minutes] = record.time.split(':');
        const recordTime = new Date(record._date);
        recordTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        const minutesDiff = (currentTime - recordTime) / (1000 * 60);
        if (minutesDiff < 0) return;
        const halfLife = 300;
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
        const grams = record.alcohol / 1000;
        totalAlcoholGrams += grams;
        const [hours, minutes] = record.time.split(':');
        const recordTime = new Date(record._date);
        recordTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        if (!latestDrinkTime || recordTime > latestDrinkTime) latestDrinkTime = recordTime;
      }
    });
    if (totalAlcoholGrams === 0) return 0;
    const hoursSinceLastDrink = latestDrinkTime ? (currentTime - latestDrinkTime) / (1000 * 3600) : 0;
    let bac = (totalAlcoholGrams / (userWeight * r)) - (0.015 * Math.max(0, hoursSinceLastDrink));
    bac = Math.max(0, bac);
    return bac;
  }, [todayRecords, currentTime, userWeight, userGender]);

  // 喝水提醒
  const waterReminder = useMemo(() => {
    if (totalWater >= dailyWaterTarget) return null;
    const lastWaterRecord = [...todayRecords]
      .filter(r => r.type === "水")
      .sort((a, b) => {
        const aTime = new Date(a._date);
        aTime.setHours(...a.time.split(':'));
        const bTime = new Date(b._date);
        bTime.setHours(...b.time.split(':'));
        return bTime - aTime;
      })[0];
    if (!lastWaterRecord) return "今天还没喝水，快喝一杯吧！";
    const [hours, minutes] = lastWaterRecord.time.split(':');
    const lastWaterTime = new Date(lastWaterRecord._date);
    lastWaterTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
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

  // 糖分提醒
  const sugarMessage = useMemo(() => {
    if (totalSugar === 0) return null;
    if (totalSugar > dailySugarLimit) {
      return `⚠️ 今日糖分摄入 ${totalSugar} g，超过建议上限 ${dailySugarLimit} g，注意控制。`;
    }
    return `🍬 今日糖分摄入 ${totalSugar} g，在建议范围内。`;
  }, [totalSugar, dailySugarLimit]);

  // 热量提醒
  const caloriesMessage = useMemo(() => {
    if (totalCalories === 0) return null;
    if (totalCalories > dailyCaloriesLimit) {
      return `⚠️ 今日热量摄入 ${totalCalories} kcal，超过建议上限 ${dailyCaloriesLimit} kcal，注意控制。`;
    }
    return `🔥 今日热量摄入 ${totalCalories} kcal，在建议范围内。`;
  }, [totalCalories, dailyCaloriesLimit]);

  // 脂肪提醒
  const fatMessage = useMemo(() => {
    if (totalFat === 0) return null;
    if (totalFat > dailyFatLimit) {
      return `⚠️ 今日脂肪摄入 ${totalFat} g，超过建议上限 ${dailyFatLimit} g，注意控制。`;
    }
    return `🥑 今日脂肪摄入 ${totalFat} g，在建议范围内。`;
  }, [totalFat, dailyFatLimit]);

  // 个性化建议
  const healthAdvice = useMemo(() => {
    const advices = [];

    if (userWeight > 0) {
      const recommendedWater = Math.round(userWeight * 30);
      advices.push(`💧 根据您的体重 ${userWeight} kg，每日建议饮水量约 ${recommendedWater} ml。`);
    } else {
      advices.push(`💧 建议在个人设置中填写体重，以便获得更精准的饮水建议。`);
    }

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

    advices.push(`🍬 WHO 建议每日添加糖摄入不超过 50 g，您当前 ${totalSugar} g。`);
    advices.push(`🔥 每日热量摄入建议 ${dailyCaloriesLimit} kcal，您当前 ${totalCalories} kcal。`);
    advices.push(`🥑 每日脂肪摄入建议不超过 ${dailyFatLimit} g，您当前 ${totalFat} g。`);

    return advices;
  }, [userWeight, userAge, userBloodSugar, totalSugar, totalCalories, totalFat, dailyCaloriesLimit, dailyFatLimit]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50 mb-4">
      <h3 className="text-base font-semibold text-slate-800 mb-3">💡 健康助手</h3>

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
        <div className="flex items-start gap-2 text-sm">
          <span className="text-pink-500">🍬</span>
          <p className="text-slate-700">{sugarMessage || "今日无糖分摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-red-500">🔥</span>
          <p className="text-slate-700">{caloriesMessage || "今日无热量摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-green-500">🥑</span>
          <p className="text-slate-700">{fatMessage || "今日无脂肪摄入"}</p>
        </div>
      </div>
    </div>
  );
};

// ==================== 子组件 ====================
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
  totalSugar,
  dailySugarLimit,
  exceedSugarLimit,
  totalCalories,
  dailyCaloriesLimit,
  exceedCaloriesLimit,
  totalFat,
  dailyFatLimit,
  exceedFatLimit,
  onAddDrink,
  userWeight,
  userGender,
  todayRecords,
  userAge,
  userBloodSugar
}) => {
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

  const scrollToCard = (index) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const RemainingItem = ({ label, value, limit, unit, exceedColor = "text-rose-600", normalColor = "text-slate-700" }) => (
    <div className="mt-1 flex justify-between text-sm">
      <span>{label}</span>
      <span className={value > limit ? exceedColor : normalColor}>
        {Math.max(0, limit - value)} {unit}
      </span>
    </div>
  );

  return (
    <section className="relative space-y-4">
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex">
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
              <p className="mt-4 text-sm text-slate-500">🍬 今天已摄入糖分</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalSugar} g</p>
              <p className={`mt-1 text-xs ${exceedSugarLimit ? "text-rose-600" : "text-slate-500"}`}>
                每日糖分上限 {dailySugarLimit} g {exceedSugarLimit ? "（已超出）" : ""}
              </p>
              <p className="mt-4 text-sm text-slate-500">🔥 今天已摄入热量</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalCalories} kcal</p>
              <p className={`mt-1 text-xs ${exceedCaloriesLimit ? "text-rose-600" : "text-slate-500"}`}>
                每日热量上限 {dailyCaloriesLimit} kcal {exceedCaloriesLimit ? "（已超出）" : ""}
              </p>
              <p className="mt-4 text-sm text-slate-500">🥑 今天已摄入脂肪</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{totalFat} g</p>
              <p className={`mt-1 text-xs ${exceedFatLimit ? "text-rose-600" : "text-slate-500"}`}>
                每日脂肪上限 {dailyFatLimit} g {exceedFatLimit ? "（已超出）" : ""}
              </p>
              <div className="mt-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>饮水进度</span>
                  <span>{Math.min(100, Math.floor((totalWater / dailyWaterTarget) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-[#3b82f6] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (totalWater / dailyWaterTarget) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">🎯 今日剩余</p>
                <RemainingItem label="咖啡因" value={totalCaffeine} limit={dailyLimit} unit="mg" />
                <RemainingItem label="酒精" value={totalAlcohol} limit={dailyAlcoholLimit} unit="mg" />
                <RemainingItem label="水分" value={totalWater} limit={dailyWaterTarget} unit="ml" normalColor="text-slate-700" />
                <RemainingItem label="糖分" value={totalSugar} limit={dailySugarLimit} unit="g" />
                <RemainingItem label="热量" value={totalCalories} limit={dailyCaloriesLimit} unit="kcal" />
                <RemainingItem label="脂肪" value={totalFat} limit={dailyFatLimit} unit="g" />
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-full snap-start px-2">
            <HealthAssistant
              todayRecords={todayRecords}
              userWeight={userWeight}
              userGender={userGender}
              dailyWaterTarget={dailyWaterTarget}
              totalWater={totalWater}
              userAge={userAge}
              userBloodSugar={userBloodSugar}
              totalSugar={totalSugar}
              totalCalories={totalCalories}
              totalFat={totalFat}
              dailySugarLimit={dailySugarLimit}
              dailyCaloriesLimit={dailyCaloriesLimit}
              dailyFatLimit={dailyFatLimit}
            />
          </div>
        </div>
      </div>
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
      <div className="fixed bottom-20 right-6 z-20">
        <button
          onClick={() => onAddDrink("咖啡")}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-[#b08968] text-white shadow-lg hover:bg-[#9c7a5f] transition-all active:scale-95"
        >
          <span className="text-3xl">+</span>
        </button>
      </div>
    </section>
  );
};

// 数据趋势标签页
const TrendTab = ({
  normalizedRecords,
  today,
  records,
  filterDate,
  setFilterDate,
  onEdit,
  onDelete
}) => {
  const [caffeineRange, setCaffeineRange] = useState("今日");
  const [alcoholRange, setAlcoholRange] = useState("今日");
  const [waterRange, setWaterRange] = useState("今日");
  const [sugarRange, setSugarRange] = useState("今日");
  const [caloriesRange, setCaloriesRange] = useState("今日");
  const [fatRange, setFatRange] = useState("今日");

  const caffeineChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, caffeineRange, today);
    return getTrendChartData(filtered, caffeineRange, today, 'caffeine');
    }, [normalizedRecords, caffeineRange, today]
  );
  const alcoholChartData = useMemo(
    () => getTrendChartData(normalizedRecords, alcoholRange, today, 'alcohol'),
    [normalizedRecords, alcoholRange, today]
  );
  const waterChartData = useMemo(
    () => getTrendChartData(normalizedRecords, waterRange, today, 'water'),
    [normalizedRecords, waterRange, today]
  );
  const sugarChartData = useMemo(
    () => getTrendChartData(normalizedRecords, sugarRange, today, 'sugar_g'),
    [normalizedRecords, sugarRange, today]
  );
  const caloriesChartData = useMemo(
    () => getTrendChartData(normalizedRecords, caloriesRange, today, 'calories_kcal'),
    [normalizedRecords, caloriesRange, today]
  );
  const fatChartData = useMemo(
    () => getTrendChartData(normalizedRecords, fatRange, today, 'fat_g'),
    [normalizedRecords, fatRange, today]
  );

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

  const filteredPieData = pieData.filter(item => item.value > 0);
  const totalCount = filteredPieData.reduce((sum, d) => sum + d.value, 0);

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

  const CalendarHeatmap = () => {
    const [currentDate, setCurrentDate] = useState(new Date(today));
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startWeekday = firstDayOfMonth.getDay();

    const monthRecords = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const recordsInMonth = normalizedRecords.filter(r => {
        const d = r._date;
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const countMap = new Map();
      recordsInMonth.forEach(r => {
        const day = r._date.getDate();
        countMap.set(day, (countMap.get(day) || 0) + 1);
      });
      return countMap;
    }, [normalizedRecords, currentDate]);

    const maxCount = useMemo(() => {
      let max = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const count = monthRecords.get(day) || 0;
        if (count > max) max = count;
      }
      return max;
    }, [monthRecords, daysInMonth]);

    const getBgColorStyle = (count) => {
      if (count === 0) return "white";
      if (maxCount === 0) return "#f3f4f6";
      const intensity = count / maxCount;
      const saturation = 30 + intensity * 40;
      const lightness = 80 - intensity * 50;
      return `hsl(30, ${saturation}%, ${lightness}%)`;
    };

    const prevMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const totalCells = 42;
    const cells = [];
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startWeekday);
    for (let i = 0; i < totalCells; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const day = date.getDate();
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
      const count = monthRecords.get(day) || 0;
      cells.push({ date, day, isCurrentMonth, count });
    }

    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-indigo-50 mb-4">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={prevMonth}
            className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            ◀
          </button>
          <h3 className="text-lg font-semibold text-slate-800">
            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
          </h3>
          <button
            onClick={nextMonth}
            className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            ▶
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
          {["日", "一", "二", "三", "四", "五", "六"].map(weekday => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            let bgColor = "white";
            if (cell.isCurrentMonth && cell.count > 0) {
              bgColor = getBgColorStyle(cell.count);
            } else if (!cell.isCurrentMonth) {
              bgColor = "#f9fafb";
            } else {
              bgColor = "white";
            }
            return (
              <div
                key={idx}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm
                  ${!cell.isCurrentMonth ? "text-slate-300" : "text-slate-700"}
                  border border-slate-100 hover:shadow-md transition
                `}
                style={{ backgroundColor: bgColor }}
                title={`${cell.day}日：${cell.count}杯`}
              >
                {cell.isCurrentMonth ? cell.day : ""}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-slate-400 text-center">
          颜色越深表示当天记录杯数越多
        </div>
      </div>
    );
  };

  const trendCards = [
    { title: "咖啡因", unit: "mg", chartData: caffeineChartData, range: caffeineRange, setRange: setCaffeineRange, color: COLORS.primary },
    { title: "酒精", unit: "mg", chartData: alcoholChartData, range: alcoholRange, setRange: setAlcoholRange, color: "#f59e0b" },
    { title: "水分", unit: "ml", chartData: waterChartData, range: waterRange, setRange: setWaterRange, color: "#3b82f6" },
    { title: "糖分", unit: "g", chartData: sugarChartData, range: sugarRange, setRange: setSugarRange, color: "#ec489a" },
    { title: "热量", unit: "kcal", chartData: caloriesChartData, range: caloriesRange, setRange: setCaloriesRange, color: "#ef4444" },
    { title: "脂肪", unit: "g", chartData: fatChartData, range: fatRange, setRange: setFatRange, color: "#10b981" }
  ];

  return (
    <section className="space-y-4">
      <CalendarHeatmap />
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
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex">
          {trendCards.map((card, idx) => renderTrendCard(card.title, card.unit, card.chartData, card.range, card.setRange, card.color))}
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-2">
        {trendCards.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-2 rounded-full transition-all ${
              activeIndex === idx ? "w-4 bg-[#3C281E]" : "bg-slate-300"
            }`}
          />
        ))}
      </div>
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

// 个人设置标签页
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
  dailySugarLimit,
  setDailySugarLimit,
  dailyCaloriesLimit,
  setDailyCaloriesLimit,
  dailyFatLimit,
  setDailyFatLimit,
  onExportCsv,
  onResetAll,
  onAvatarUpload,
  setProfile
}) => {
  const [tempDailyLimit, setTempDailyLimit] = useState(String(dailyLimit));
  const [tempDailyAlcoholLimit, setTempDailyAlcoholLimit] = useState(String(dailyAlcoholLimit));
  const [tempDailyWaterTarget, setTempDailyWaterTarget] = useState(String(dailyWaterTarget));
  const [tempDailySugarLimit, setTempDailySugarLimit] = useState(String(dailySugarLimit));
  const [tempDailyCaloriesLimit, setTempDailyCaloriesLimit] = useState(String(dailyCaloriesLimit));
  const [tempDailyFatLimit, setTempDailyFatLimit] = useState(String(dailyFatLimit));

  useEffect(() => {
    setTempDailyLimit(String(dailyLimit));
  }, [dailyLimit]);
  useEffect(() => {
    setTempDailyAlcoholLimit(String(dailyAlcoholLimit));
  }, [dailyAlcoholLimit]);
  useEffect(() => {
    setTempDailyWaterTarget(String(dailyWaterTarget));
  }, [dailyWaterTarget]);
  useEffect(() => {
    setTempDailySugarLimit(String(dailySugarLimit));
  }, [dailySugarLimit]);
  useEffect(() => {
    setTempDailyCaloriesLimit(String(dailyCaloriesLimit));
  }, [dailyCaloriesLimit]);
  useEffect(() => {
    setTempDailyFatLimit(String(dailyFatLimit));
  }, [dailyFatLimit]);

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

  const handleDailySugarLimitBlur = () => {
    let val = tempDailySugarLimit.trim();
    if (val === "") {
      setTempDailySugarLimit(String(dailySugarLimit));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailySugarLimit(String(dailySugarLimit));
      return;
    }
    num = Math.min(200, Math.max(0, num));
    setDailySugarLimit(num);
    setTempDailySugarLimit(String(num));
  };

  const handleDailyCaloriesLimitBlur = () => {
    let val = tempDailyCaloriesLimit.trim();
    if (val === "") {
      setTempDailyCaloriesLimit(String(dailyCaloriesLimit));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailyCaloriesLimit(String(dailyCaloriesLimit));
      return;
    }
    num = Math.min(5000, Math.max(0, num));
    setDailyCaloriesLimit(num);
    setTempDailyCaloriesLimit(String(num));
  };

  const handleDailyFatLimitBlur = () => {
    let val = tempDailyFatLimit.trim();
    if (val === "") {
      setTempDailyFatLimit(String(dailyFatLimit));
      return;
    }
    let num = Number(val);
    if (isNaN(num)) {
      setTempDailyFatLimit(String(dailyFatLimit));
      return;
    }
    num = Math.min(200, Math.max(0, num));
    setDailyFatLimit(num);
    setTempDailyFatLimit(String(num));
  };

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
        <p className="mt-2 text-xs text-slate-500">设置每日摄入咖啡因、酒精、糖分、热量、脂肪上限和喝水目标。</p>
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
        <label className="mt-4 block text-sm text-slate-600">
          每日糖分上限（g）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailySugarLimit}
            onChange={(e) => setTempDailySugarLimit(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailySugarLimitBlur}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-600">
          每日热量上限（kcal）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailyCaloriesLimit}
            onChange={(e) => setTempDailyCaloriesLimit(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailyCaloriesLimitBlur}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-600">
          每日脂肪上限（g）
          <input
            type="text"
            inputMode="numeric"
            value={tempDailyFatLimit}
            onChange={(e) => setTempDailyFatLimit(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={handleDailyFatLimitBlur}
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

        {time !== undefined && (
          <>
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

  // 每日上限
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
      if (!saved) return 14000;
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
  const [dailySugarLimit, setDailySugarLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 50;
      const parsed = JSON.parse(saved);
      return Number(parsed.dailySugarLimit) || 50;
    } catch {
      return 50;
    }
  });
  const [dailyCaloriesLimit, setDailyCaloriesLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 2000;
      const parsed = JSON.parse(saved);
      return Number(parsed.dailyCaloriesLimit) || 2000;
    } catch {
      return 2000;
    }
  });
  const [dailyFatLimit, setDailyFatLimit] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return 70;
      const parsed = JSON.parse(saved);
      return Number(parsed.dailyFatLimit) || 70;
    } catch {
      return 70;
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

  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // 标准化记录：优先使用存储的 _date 字符串
  const normalizedRecords = useMemo(() =>
    records.map((r) => {
      let recordDate;

      // 优先使用存储的 _date 字符串（YYYY-MM-DD）
      if (r._date && typeof r._date === 'string' && r._date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = r._date.split('-');
        const [hours, minutes] = r.time ? r.time.split(':') : ['0', '0'];
        recordDate = new Date(year, month-1, day, hours, minutes);
      } 
      // 兼容旧数据：没有 _date 字符串但有 createdAt
      else if (r.createdAt) {
        const datePart = extractDateFromISO(r.createdAt);
        if (datePart && r.time) {
          const [year, month, day] = datePart.split('-');
          const [hours, minutes] = r.time.split(':');
          recordDate = new Date(year, month-1, day, hours, minutes);
        } else if (datePart) {
          const [year, month, day] = datePart.split('-');
          recordDate = new Date(year, month-1, day, 0, 0);
        } else {
          recordDate = new Date();
        }
      } 
      // 最旧的兼容：_date 是 Date 对象
      else if (r._date && r.time) {
        let dateObj = r._date;
        if (typeof dateObj === 'string') {
          dateObj = new Date(dateObj);
        }
        const [hours, minutes] = r.time.split(':');
        recordDate = new Date(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate(),
          hours,
          minutes
        );
      } else {
        recordDate = new Date();
      }

      recordDate = normalizeDate(recordDate);

      return {
        ...r,
        _date: recordDate,
        cupSize: r.cupSize || CUP_SIZES[1],
        waterTemp: r.waterTemp || WATER_TEMP_OPTIONS[0],
        alcoholIce: r.alcoholIce || ALCOHOL_ICE_OPTIONS[0],
        water: r.water ?? 0,
        alcohol: r.alcohol ?? 0,
        caffeine: r.caffeine ?? 0,
        sugar_g: r.sugar_g ?? 0,
        calories_kcal: r.calories_kcal ?? 0,
        fat_g: r.fat_g ?? 0
      };
    }),
    [records]
  );

  const todayRecords = useMemo(
    () => normalizedRecords.filter((r) => isSameDay(r._date, today)),
    [normalizedRecords, today]
  );

  const totalCaffeine = todayRecords.reduce((sum, r) => sum + (r.caffeine || 0), 0);
  const totalAlcohol = todayRecords.reduce((sum, r) => sum + (r.alcohol || 0), 0);
  const totalWater = todayRecords.reduce((sum, r) => sum + (r.water || 0), 0);
  const totalSugar = todayRecords.reduce((sum, r) => sum + (r.sugar_g || 0), 0);
  const totalCalories = todayRecords.reduce((sum, r) => sum + (r.calories_kcal || 0), 0);
  const totalFat = todayRecords.reduce((sum, r) => sum + (r.fat_g || 0), 0);

  const exceedLimit = totalCaffeine > dailyLimit;
  const exceedAlcoholLimit = totalAlcohol > dailyAlcoholLimit;
  const exceedWaterTarget = totalWater >= dailyWaterTarget;
  const exceedSugarLimit = totalSugar > dailySugarLimit;
  const exceedCaloriesLimit = totalCalories > dailyCaloriesLimit;
  const exceedFatLimit = totalFat > dailyFatLimit;

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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      dailyLimit,
      dailyAlcoholLimit,
      dailyWaterTarget,
      dailySugarLimit,
      dailyCaloriesLimit,
      dailyFatLimit
    }));
  }, [dailyLimit, dailyAlcoholLimit, dailyWaterTarget, dailySugarLimit, dailyCaloriesLimit, dailyFatLimit]);
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  const openPicker = useCallback((type, existingRecord = null) => {
    if (existingRecord) {
      let recordDate = "";
      // 优先使用存储的 _date 字符串
      if (existingRecord._date && typeof existingRecord._date === 'string') {
        recordDate = existingRecord._date;
      } else if (existingRecord.createdAt) {
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

    if (pickerState.date && pickerState.time) {
      const [year, month, day] = pickerState.date.split('-');
      const [hours, minutes] = pickerState.time.split(':');
      finalDate = new Date(year, month-1, day, hours, minutes);
    } else if (pickerState.date) {
      const [year, month, day] = pickerState.date.split('-');
      finalDate = new Date(year, month-1, day, now.getHours(), now.getMinutes());
    }

    // 本地日期字符串
    const normalizedDate = finalDate.toLocaleString('sv-SE').split(' ')[0]; // "YYYY-MM-DD"
    const createdAtISO = finalDate.toLocaleString('sv-SE').replace(' ', 'T');
    const newTime = pickerState.time || `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    if (editingId) {
      // 编辑现有记录
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== editingId) return r;
          const base = {
            ...r,
            type: pickerState.type,
            time: newTime,
            createdAt: createdAtISO,
            _date: normalizedDate   // 存储本地日期字符串
          };
          if (pickerState.type === "咖啡" || pickerState.type === "奶茶") {
            const multiplier = CUP_MULTIPLIER[pickerState.cupSize];
            const baseCaffeine = CAFFEINE_BASE[pickerState.type];
            const caffeine = Math.round(baseCaffeine * multiplier);
            const sugarMultiplier = SUGAR_MULTIPLIER[pickerState.sugar];
            const sugar = SUGAR_BASE[pickerState.type] * multiplier * sugarMultiplier;
            const calories = CALORIES_BASE[pickerState.type] * multiplier + sugar * 4;
            const fat = FAT_BASE[pickerState.type] * multiplier * sugarMultiplier;
            return {
              ...base,
              cupSize: pickerState.cupSize,
              ice: pickerState.ice,
              sugar: pickerState.sugar,
              caffeine,
              sugar_g: sugar,
              calories_kcal: Math.round(calories),
              fat_g: Math.round(fat * 10) / 10,
              alcohol: 0,
              water: 0
            };
          }
          if (pickerState.type === "酒") {
            const amount = Number(pickerState.customAmount) || 0;
            const alcoholGrams = amount / 1000;
            const calories = alcoholGrams * 7;
            return {
              ...base,
              alcoholIce: pickerState.alcoholIce,
              alcohol: amount,
              sugar_g: 0,
              calories_kcal: Math.round(calories),
              fat_g: 0,
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
              sugar_g: 0,
              calories_kcal: 0,
              fat_g: 0,
              caffeine: 0,
              alcohol: 0
            };
          }
          return base;
        })
      );
    } else {
      // 新增记录
      let newRecord = {
        id: `${now.getTime()}`,
        type: pickerState.type,
        time: newTime,
        createdAt: createdAtISO,
        _date: normalizedDate   // 存储本地日期字符串
      };
      if (pickerState.type === "咖啡" || pickerState.type === "奶茶") {
        const multiplier = CUP_MULTIPLIER[pickerState.cupSize];
        const baseCaffeine = CAFFEINE_BASE[pickerState.type];
        const caffeine = Math.round(baseCaffeine * multiplier);
        const sugarMultiplier = SUGAR_MULTIPLIER[pickerState.sugar];
        const sugar = SUGAR_BASE[pickerState.type] * multiplier * sugarMultiplier;
        const calories = CALORIES_BASE[pickerState.type] * multiplier + sugar * 4;
        const fat = FAT_BASE[pickerState.type] * multiplier * sugarMultiplier;
        newRecord = {
          ...newRecord,
          cupSize: pickerState.cupSize,
          ice: pickerState.ice,
          sugar: pickerState.sugar,
          caffeine,
          sugar_g: sugar,
          calories_kcal: Math.round(calories),
          fat_g: Math.round(fat * 10) / 10,
          alcohol: 0,
          water: 0
        };
      } else if (pickerState.type === "酒") {
        const amount = Number(pickerState.customAmount) || 0;
        const alcoholGrams = amount / 1000;
        const calories = alcoholGrams * 7;
        newRecord = {
          ...newRecord,
          alcoholIce: pickerState.alcoholIce,
          alcohol: amount,
          sugar_g: 0,
          calories_kcal: Math.round(calories),
          fat_g: 0,
          caffeine: 0,
          water: 0
        };
      } else if (pickerState.type === "水") {
        const amount = Number(pickerState.customAmount) || 0;
        newRecord = {
          ...newRecord,
          waterTemp: pickerState.waterTemp,
          water: amount,
          sugar_g: 0,
          calories_kcal: 0,
          fat_g: 0,
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
    const header = ["日期", "时间", "类型", "杯型", "冰度", "糖度", "酒冰度", "水冷暖", "咖啡因(mg)", "酒精(mg)", "水量(ml)", "糖分(g)", "热量(kcal)", "脂肪(g)"];
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
        String(r.water || 0),
        String(r.sugar_g || 0),
        String(r.calories_kcal || 0),
        String(r.fat_g || 0)
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
            totalSugar={totalSugar}
            dailySugarLimit={dailySugarLimit}
            exceedSugarLimit={exceedSugarLimit}
            totalCalories={totalCalories}
            dailyCaloriesLimit={dailyCaloriesLimit}
            exceedCaloriesLimit={exceedCaloriesLimit}
            totalFat={totalFat}
            dailyFatLimit={dailyFatLimit}
            exceedFatLimit={exceedFatLimit}
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
            dailySugarLimit={dailySugarLimit}
            setDailySugarLimit={setDailySugarLimit}
            dailyCaloriesLimit={dailyCaloriesLimit}
            setDailyCaloriesLimit={setDailyCaloriesLimit}
            dailyFatLimit={dailyFatLimit}
            setDailyFatLimit={setDailyFatLimit}
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