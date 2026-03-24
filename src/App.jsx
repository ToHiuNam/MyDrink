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
const CUSTOM_DRINKS_KEY = "mydrink-custom-drinks-v1";
const INGREDIENTS_KEY = "mydrink-ingredients-v1";
const THEME_KEY = "mydrink-theme-v1";
const DRINK_TYPES = ["咖啡", "奶茶", "酒", "水", "茶", "果汁", "碳酸饮料"];

// 主题配置
const THEMES = {
  light: {
    name: "浅色模式",
    colors: {
      background: "bg-gradient-to-b from-indigo-50 via-slate-100 to-slate-100",
      card: "bg-white",
      cardColor: "white",
      text: "text-slate-800",
      textColor: "#1e293b",
      textSecondary: "text-slate-600",
      textSecondaryColor: "#475569",
      textLight: "text-slate-500",
      textLightColor: "#64748b",
      border: "border-slate-200",
      borderColor: "#e2e8f0",
      borderLight: "border-slate-100",
      borderLightColor: "#f1f5f9",
      cardBorder: "ring-indigo-50",
      cardBorderColor: "#eef2ff",
      accent: "bg-[#b08968]",
      accentColor: "#b08968",
      accentText: "text-[#3C281E]",
      accentTextColor: "#3C281E",
      accentLight: "bg-[rgba(176,137,104,0.4)]",
      accentLightColor: "rgba(176,137,104,0.4)",
      warning: "bg-amber-50",
      warningColor: "#fffbeb",
      warningBorder: "border-amber-200",
      warningBorderColor: "#fde68a",
      info: "bg-indigo-50",
      infoColor: "#eff6ff",
      infoBorder: "border-indigo-200",
      infoBorderColor: "#bfdbfe",
      danger: "bg-rose-50",
      dangerColor: "#fff1f2",
      dangerBorder: "border-rose-200",
      dangerBorderColor: "#fecaca",
      progress: "bg-[#3b82f6]",
      progressColor: "#3b82f6",
      pie: {
        咖啡: "#9c7a5f",
        奶茶: "#b08968",
        酒: "#ffc02e",
        水: "#90ccfb",
        茶: "#8caf92",
        果汁: "#ff7b54",
        碳酸饮料: "#4dabf7"
      }
    }
  },
  dark: {
    name: "深色模式",
    colors: {
      background: "bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900",
      card: "bg-gray-800",
      cardColor: "#1f2937",
      text: "text-gray-100",
      textColor: "#f3f4f6",
      textSecondary: "text-gray-300",
      textSecondaryColor: "#d1d5db",
      textLight: "text-gray-400",
      textLightColor: "#9ca3af",
      border: "border-gray-700",
      borderColor: "#374151",
      borderLight: "border-gray-600",
      borderLightColor: "#4b5563",
      cardBorder: "ring-gray-700",
      cardBorderColor: "#374151",
      accent: "bg-[#c8a98e]",
      accentColor: "#c8a98e",
      accentText: "text-[#1a110d]",
      accentTextColor: "#1a110d",
      accentLight: "bg-[rgba(200,169,142,0.4)]",
      accentLightColor: "rgba(200,169,142,0.4)",
      warning: "bg-amber-900/30",
      warningColor: "rgba(180, 83, 9, 0.3)",
      warningBorder: "border-amber-800/50",
      warningBorderColor: "rgba(180, 83, 9, 0.5)",
      info: "bg-indigo-900/30",
      infoColor: "rgba(99, 102, 241, 0.3)",
      infoBorder: "border-indigo-800/50",
      infoBorderColor: "rgba(99, 102, 241, 0.5)",
      danger: "bg-rose-900/30",
      dangerColor: "rgba(225, 29, 72, 0.3)",
      dangerBorder: "border-rose-800/50",
      dangerBorderColor: "rgba(225, 29, 72, 0.5)",
      progress: "bg-[#60a5fa]",
      progressColor: "#60a5fa",
      pie: {
        咖啡: "#c8a07c",
        奶茶: "#d4a76a",
        酒: "#ffd06e",
        水: "#a8d8fb",
        茶: "#a0c9a6",
        果汁: "#ff9b7a",
        碳酸饮料: "#6db6fa"
      }
    }
  }
};

// UI 风格配置
const UI_STYLES = {
  default: { name: "默认风格", cardRadius: "rounded-2xl", buttonRadius: "rounded-xl", shadow: "shadow-sm" },
  pixel: { name: "像素风格", cardRadius: "rounded-none", buttonRadius: "rounded-none", shadow: "shadow-none border-2 border-gray-300 dark:border-gray-600" },
  apple: { name: "苹果风格", cardRadius: "rounded-3xl", buttonRadius: "rounded-2xl", shadow: "shadow-md" }
};

// 杯型与系数（中杯1.0，大杯1.2，超大杯1.3）
const CUP_SIZES = ["中杯", "大杯", "超大杯"];
const CAFFEINE_BASE = { 咖啡: 95, 奶茶: 45, 茶: 30 }; // 中杯基准值
const CUP_MULTIPLIER = { 中杯: 1.0, 大杯: 1.2, 超大杯: 1.3 };

// 糖度选项
const ICE_OPTIONS = ["去冰", "少冰", "正常冰"];
const SUGAR_OPTIONS = ["无糖", "微糖", "半糖", "全糖"];

// 糖分系数（中杯半糖基准 g）
const SUGAR_BASE = { 咖啡: 0, 奶茶: 10, 茶: 0, 果汁: 15, 碳酸饮料: 12 };
const SUGAR_MULTIPLIER = { 无糖: 0, 微糖: 0.5, 半糖: 1.0, 全糖: 1.5 };

// 热量基准（中杯基准 kcal）
const CALORIES_BASE = { 咖啡: 5, 奶茶: 50, 酒: 7, 水: 0, 茶: 2, 果汁: 60, 碳酸饮料: 40 };
// 脂肪基准（中杯基准 g）
const FAT_BASE = { 咖啡: 0, 奶茶: 3, 酒: 0, 水: 0, 茶: 0, 果汁: 0, 碳酸饮料: 0 };

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
    水: "#90ccfb",
    茶: "#8caf92",
    果汁: "#ff7b54",
    碳酸饮料: "#4dabf7"
  }
};

// 计算对比度颜色函数
const getContrastColor = (hexColor) => {
  // 移除#号
  const hex = hexColor.replace("#", "");
  
  // 转换为RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 根据亮度返回黑色或白色
  return brightness > 128 ? "#000000" : "#ffffff";
};

const PIE_COLORS = COLORS.pie;

// ==================== 辅助函数 ====================

// 计算记录的营养成分
const calculateNutrition = (type, cupSize, sugar, customAmount) => {
  if (type === "咖啡" || type === "奶茶" || type === "茶" || type === "果汁" || type === "碳酸饮料") {
    const multiplier = CUP_MULTIPLIER[cupSize];
    const baseCaffeine = CAFFEINE_BASE[type] || 0;
    const caffeine = Math.round(baseCaffeine * multiplier);
    const sugarMultiplier = SUGAR_MULTIPLIER[sugar];
    const sugar_g = SUGAR_BASE[type] * multiplier * sugarMultiplier;
    const calories = CALORIES_BASE[type] * multiplier + sugar_g * 4;
    const fat_g = FAT_BASE[type] * multiplier;
    
    return {
      caffeine,
      sugar_g,
      calories_kcal: Math.round(calories),
      fat_g: Math.round(fat_g * 10) / 10,
      alcohol: 0,
      water: 0
    };
  } else if (type === "酒") {
    const amount = Number(customAmount) || 0;
    const alcoholGrams = amount / 1000;
    const calories = alcoholGrams * 7;
    
    return {
      alcohol: amount,
      sugar_g: 0,
      calories_kcal: Math.round(calories),
      fat_g: 0,
      caffeine: 0,
      water: 0
    };
  } else if (type === "水") {
    const amount = Number(customAmount) || 0;
    
    return {
      water: amount,
      sugar_g: 0,
      calories_kcal: 0,
      fat_g: 0,
      caffeine: 0,
      alcohol: 0
    };
  }
  
  return {
    caffeine: 0,
    alcohol: 0,
    water: 0,
    sugar_g: 0,
    calories_kcal: 0,
    fat_g: 0
  };
};
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
  dailyFatLimit,
  currentTheme,
  currentUiStyle
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
    advices.push(`🔥 WHO 建议成年人每日热量摄入：女性约 2000 kcal，男性约 2500 kcal，您当前 ${totalCalories} kcal。`);
    advices.push(`🥑 WHO 建议每日脂肪摄入不超过 65 g，您当前 ${totalFat} g。`);

    return advices;
  }, [userWeight, userAge, userBloodSugar, totalSugar, totalCalories, totalFat]);

  return (
    <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mb-4 transition-all duration-300`}>
      <h3 className={`text-base font-semibold ${currentTheme.colors.text} mb-3`}>💡 健康助手</h3>

      <div className={`${currentTheme.colors.warning} rounded-xl p-3 mb-4 border ${currentTheme.colors.warningBorder}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">📋</span>
          <h4 className={`font-medium ${currentTheme.colors.text}`}>今日摄入建议</h4>
        </div>
        <ul className={`space-y-1 text-sm ${currentTheme.colors.textSecondary}`}>
          {healthAdvice.map((advice, idx) => (
            <li key={idx}>{advice}</li>
          ))}
        </ul>
      </div>

      <div className={`${currentTheme.colors.info} rounded-xl p-3 mb-4 border ${currentTheme.colors.infoBorder}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📈</span>
          <h4 className={`font-medium ${currentTheme.colors.text}`}>健康趋势关联</h4>
        </div>
        <p className={`text-xs ${currentTheme.colors.textLight} mb-3`}>
          定期在「个人设置」中更新体重和血糖，系统将根据您的饮品记录分析健康趋势。
        </p>
        <div className="space-y-2">
          {userWeight > 0 && (
            <div className="flex justify-between text-xs">
              <span className={currentTheme.colors.textSecondary}>体重与饮水关联</span>
              <span className={`font-medium ${currentTheme.colors.text}`}>
                {totalWater >= userWeight * 30 ? "✅ 达标" : "⚠️ 不足"}
              </span>
            </div>
          )}
          {userBloodSugar > 0 && (
            <div className="flex justify-between text-xs">
              <span className={currentTheme.colors.textSecondary}>血糖与糖分摄入</span>
              <span className={`font-medium ${currentTheme.colors.text}`}>
                {userBloodSugar < 6.1 && totalSugar <= dailySugarLimit ? "✅ 正常" : "⚠️ 需注意"}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className={currentTheme.colors.textSecondary}>咖啡因与睡眠建议</span>
            <span className={`font-medium ${currentTheme.colors.text}`}>
              {currentTime.getHours() >= 20 && caffeineRemaining > 50 ? "⚠️ 避免摄入" : "✅ 可适量"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className={currentTheme.colors.textSecondary}>酒精代谢状态</span>
            <span className={`font-medium ${currentTheme.colors.text}`}>
              {alcoholBAC > 0.03 ? "⚠️ 不宜驾驶" : "✅ 安全"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {waterReminder && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-blue-500">💧</span>
            <p className={currentTheme.colors.textSecondary}>{waterReminder}</p>
          </div>
        )}
        <div className="flex items-start gap-2 text-sm">
          <span className="text-orange-500">☕️</span>
          <p className={currentTheme.colors.textSecondary}>{caffeineMessage || "今日无咖啡因摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-amber-500">🍺</span>
          <p className={currentTheme.colors.textSecondary}>{alcoholMessage || "今日无酒精摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-pink-500">🍬</span>
          <p className={currentTheme.colors.textSecondary}>{sugarMessage || "今日无糖分摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-red-500">🔥</span>
          <p className={currentTheme.colors.textSecondary}>{caloriesMessage || "今日无热量摄入"}</p>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-green-500">🥑</span>
          <p className={currentTheme.colors.textSecondary}>{fatMessage || "今日无脂肪摄入"}</p>
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
  userBloodSugar,
  currentTheme,
  currentUiStyle,
  accentColor
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

  const RemainingItem = ({ label, value, limit, unit, exceedColor = "text-rose-500", normalColor = currentTheme.colors.textSecondary }) => (
    <div className="mt-1 flex justify-between text-sm">
      <span className={currentTheme.colors.text}>{label}</span>
      <span className={value > limit ? exceedColor : currentTheme.colors.text}>
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
            <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
              <p className={`text-sm ${currentTheme.colors.textLight}`}>💧 今天已摄入水分</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalWater} ml</p>
              <p className={`mt-1 text-xs ${exceedWaterTarget ? "text-green-600" : currentTheme.colors.textLight}`}>
                每日喝水目标 {dailyWaterTarget} ml {exceedWaterTarget ? "（已达成）" : `（还差 ${Math.max(0, dailyWaterTarget - totalWater)} ml）`}
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className={currentTheme.colors.textSecondary}>饮水进度</span>
                  <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalWater / dailyWaterTarget) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (totalWater / dailyWaterTarget) * 100)}%`,
                        backgroundColor: accentColor
                      }}
                    />
                  </div>
              </div>
              <p className={`mt-4 text-sm ${currentTheme.colors.textLight}`}>☕️ 今天已摄入咖啡因</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalCaffeine} mg</p>
              <p className={`mt-1 text-xs ${exceedLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                每日咖啡因上限 {dailyLimit} mg {exceedLimit ? "（已超出）" : ""}
              </p>
              <p className={`mt-4 text-sm ${currentTheme.colors.textLight}`}>🍬 今天已摄入糖分</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalSugar} g</p>
              <p className={`mt-1 text-xs ${exceedSugarLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                每日糖分上限 {dailySugarLimit} g {exceedSugarLimit ? "（已超出）" : ""}
              </p>
              <p className={`mt-4 text-sm ${currentTheme.colors.textLight}`}>🍺 今天已摄入酒精</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalAlcohol} mg</p>
              <p className={`mt-1 text-xs ${exceedAlcoholLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                每日酒精上限 {dailyAlcoholLimit} mg {exceedAlcoholLimit ? "（已超出）" : ""}
              </p>
              <p className={`mt-4 text-sm ${currentTheme.colors.textLight}`}>🔥 今天已摄入热量</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalCalories} kcal</p>
              <p className={`mt-1 text-xs ${exceedCaloriesLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                每日热量上限 {dailyCaloriesLimit} kcal {exceedCaloriesLimit ? "（已超出）" : ""}
              </p>
              <p className={`mt-4 text-sm ${currentTheme.colors.textLight}`}>🥑 今天已摄入脂肪</p>
              <p className={`mt-1 text-3xl font-bold ${currentTheme.colors.text}`}>{totalFat} g</p>
              <p className={`mt-1 text-xs ${exceedFatLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                每日脂肪上限 {dailyFatLimit} g {exceedFatLimit ? "（已超出）" : ""}
              </p>
              <div className={`mt-4 pt-2 border-t ${currentTheme.colors.border}`}>
                <p className={`text-xs ${currentTheme.colors.textLight}`}>🎯 今日剩余</p>
                <RemainingItem label="水分" value={totalWater} limit={dailyWaterTarget} unit="ml" normalColor={currentTheme.colors.textSecondary} />
                <RemainingItem label="咖啡因" value={totalCaffeine} limit={dailyLimit} unit="mg" />
                <RemainingItem label="糖分" value={totalSugar} limit={dailySugarLimit} unit="g" />
                <RemainingItem label="酒精" value={totalAlcohol} limit={dailyAlcoholLimit} unit="mg" />
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
            currentTheme={currentTheme}
            currentUiStyle={currentUiStyle}
          />
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-2">
        {[0, 1].map(idx => (
          <button
            key={idx}
            onClick={() => scrollToCard(idx)}
            className={`h-2 rounded-full transition-all ${activeIndex === idx ? 'w-4' : 'w-2'}`}
            style={{
              backgroundColor: activeIndex === idx ? accentColor : currentTheme.colors.borderLight.replace('border-', '')
            }}
          />
        ))}
      </div>
      <div className="fixed bottom-20 right-6 z-20">
        <button
          onClick={() => onAddDrink("咖啡")}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:bg-opacity-90 transition-all active:scale-95"
          style={{
            backgroundColor: accentColor,
            color: getContrastColor(accentColor)
          }}
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
  onDelete,
  currentTheme,
  currentUiStyle,
  accentColor,
  trendRange,
  setTrendRange,
  chartData
}) => {
  const [caffeineRange, setCaffeineRange] = useState("今日");
  const [alcoholRange, setAlcoholRange] = useState("今日");
  const [waterRange, setWaterRange] = useState("今日");
  const [sugarRange, setSugarRange] = useState("今日");
  const [caloriesRange, setCaloriesRange] = useState("今日");
  const [fatRange, setFatRange] = useState("今日");

  // 优化图表数据计算，使用 useMemo 缓存结果
  const caffeineChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, caffeineRange, today);
    return getTrendChartData(filtered, caffeineRange, today, 'caffeine');
  }, [normalizedRecords, caffeineRange, today]);
  
  const alcoholChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, alcoholRange, today);
    return getTrendChartData(filtered, alcoholRange, today, 'alcohol');
  }, [normalizedRecords, alcoholRange, today]);
  
  const waterChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, waterRange, today);
    return getTrendChartData(filtered, waterRange, today, 'water');
  }, [normalizedRecords, waterRange, today]);
  
  const sugarChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, sugarRange, today);
    return getTrendChartData(filtered, sugarRange, today, 'sugar_g');
  }, [normalizedRecords, sugarRange, today]);
  
  const caloriesChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, caloriesRange, today);
    return getTrendChartData(filtered, caloriesRange, today, 'calories_kcal');
  }, [normalizedRecords, caloriesRange, today]);
  
  const fatChartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, fatRange, today);
    return getTrendChartData(filtered, fatRange, today, 'fat_g');
  }, [normalizedRecords, fatRange, today]);

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
          stroke={currentTheme.name === 'light' ? '#1e293b' : '#9ca3af'}
          fill="none"
          strokeWidth={1.5}
        />
        <text
          x={textX}
          y={textY}
          fill={currentTheme.name === 'light' ? '#000000' : '#f3f4f6'}
          fontSize={12}
          fontWeight="500"
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
        <div className={`rounded-lg ${currentTheme.colors.card} p-2 shadow-md border ${currentTheme.colors.border} text-sm`}>
          <p className={`font-medium ${currentTheme.colors.text}`}>{name}</p>
          <p className={`${currentTheme.colors.textSecondary}`}>{value} 杯 ({percent}%)</p>
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
  
  const scrollToCard = (index) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * scrollContainerRef.current.clientWidth,
        behavior: 'smooth'
      });
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
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
          <div className="mb-2 flex items-center gap-2">
            <h2 className={`text-base font-semibold ${currentTheme.colors.text} flex-shrink-0`}>
              📊 {title}趋势
            </h2>
            <div className={`flex-1 min-w-0 overflow-x-auto rounded-lg ${currentTheme.colors.borderLight} p-1`}>
              <div className="flex gap-1">
                {TREND_RANGES.map((r) => (
                  <button
                    key={r}
                    className={`rounded-md px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 transition-colors duration-300 ${
                      range === r ? `${currentTheme.colors.card} ${currentTheme.colors.text} shadow-sm` : currentTheme.colors.textLight
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
            <ResponsiveContainer width="100%" height="100%" key={currentTheme.name}>
              <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${title}-${currentTheme.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={fieldColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={fieldColor} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={currentTheme.name === 'light' ? '#e2e8f0' : '#4b5563'} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12, fill: currentTheme.name === 'light' ? '#475569' : '#9ca3af' }} 
                  axisLine={{ stroke: currentTheme.name === 'light' ? '#e2e8f0' : '#4b5563' }} 
                  tickLine={{ stroke: currentTheme.name === 'light' ? '#e2e8f0' : '#4b5563' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: currentTheme.name === 'light' ? '#475569' : '#9ca3af' }} 
                  axisLine={{ stroke: currentTheme.name === 'light' ? '#e2e8f0' : '#4b5563' }} 
                  tickLine={{ stroke: currentTheme.name === 'light' ? '#e2e8f0' : '#4b5563' }}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip contentStyle={{ backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.border, color: currentTheme.colors.text }} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={fieldColor}
                  fillOpacity={1}
                  fill={`url(#gradient-${title}-${currentTheme.name})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const CalendarHeatmap = ({ accentColor }) => {
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
      if (count === 0) return currentTheme.colors.card;
      if (maxCount === 0) return currentTheme.colors.card;
      const intensity = count / maxCount;
      // 从 accentColor 中提取 RGB 值
      const hex = accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // 根据强度调整亮度
      const lightness = 1 - intensity * 0.5; // 从 100% 到 50%
      return `rgb(${Math.round(r * lightness)}, ${Math.round(g * lightness)}, ${Math.round(b * lightness)})`;
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
      date.setDate(date.getDate() + i);
      const day = date.getDate();
      const isCurrentMonth = date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
      // 只有当前月份的日期才使用monthRecords中的数据，其他月份的日期count为0
      const count = isCurrentMonth ? (monthRecords.get(day) || 0) : 0;
      cells.push({ date, day, isCurrentMonth, count });
    }

    return (
      <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mb-4 transition-all duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={prevMonth}
            className={`px-3 py-1 rounded-md bg-slate-100 ${currentTheme.colors.textSecondary} hover:bg-slate-200 transition-colors duration-300`}
          >
            ◀
          </button>
          <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
          </h3>
          <button
            onClick={nextMonth}
            className={`px-3 py-1 rounded-md bg-slate-100 ${currentTheme.colors.textSecondary} hover:bg-slate-200 transition-colors duration-300`}
          >
            ▶
          </button>
        </div>
        <div className={`grid grid-cols-7 gap-1 text-center text-xs ${currentTheme.colors.textLight} mb-2`}>
          {["日", "一", "二", "三", "四", "五", "六"].map(weekday => (
            <div key={weekday}>{weekday}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
  {cells.map((cell, idx) => (
    <div
      key={`${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`}
      className={`
        aspect-square flex items-center justify-center rounded-lg text-sm
        ${!cell.isCurrentMonth ? currentTheme.colors.textLight : currentTheme.colors.text}
        border ${currentTheme.colors.border} hover:shadow-md transition
      `}
      style={{
        backgroundColor: cell.isCurrentMonth && cell.count > 0
          ? getBgColorStyle(cell.count)
          : currentTheme.colors.card
      }}
      title={cell.isCurrentMonth ? `${cell.day}日：${cell.count}杯` : ''}
    >
      {cell.isCurrentMonth ? cell.day : ""}
    </div>
  ))}
</div>
        <div className={`mt-3 text-xs ${currentTheme.colors.textLight} text-center`}>
          颜色越深表示当天记录杯数越多
        </div>
      </div>
    );
  };

  // 检查是否有数据
  const hasData = normalizedRecords.length > 0;

  const trendCards = [
    { title: "咖啡因", unit: "mg", chartData: caffeineChartData, range: caffeineRange, setRange: setCaffeineRange, color: "#9c7a5f" },
    { title: "酒精", unit: "mg", chartData: alcoholChartData, range: alcoholRange, setRange: setAlcoholRange, color: "#f59e0b" },
    { title: "水分", unit: "ml", chartData: waterChartData, range: waterRange, setRange: setWaterRange, color: "#3b82f6" },
    { title: "糖分", unit: "g", chartData: sugarChartData, range: sugarRange, setRange: setSugarRange, color: "#ec489a" },
    { title: "热量", unit: "kcal", chartData: caloriesChartData, range: caloriesRange, setRange: setCaloriesRange, color: "#ef4444" },
    { title: "脂肪", unit: "g", chartData: fatChartData, range: fatRange, setRange: setFatRange, color: "#10b981" }
  ];

  return (
    <section className="space-y-4">
      {hasData ? (
        <>
          <CalendarHeatmap accentColor={accentColor} />
          <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className={`text-base font-semibold ${currentTheme.colors.text} flex-shrink-0`}>🥤 {getPieTitle()}</h2>
              <div className={`flex-1 min-w-0 overflow-x-auto rounded-lg ${currentTheme.colors.borderLight} p-1`}>
                <div className="flex gap-1">
                  {TREND_RANGES.map((range) => (
                    <button
                      key={range}
                      className={`rounded-md px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 transition-colors duration-300 ${
                        pieRange === range ? `${currentTheme.colors.card} ${currentTheme.colors.text} shadow-sm` : currentTheme.colors.textLight
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
                <div className={`flex h-full items-center justify-center text-sm ${currentTheme.colors.textLight}`}>
                  暂无数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" key={currentTheme.name}>
                  <PieChart>
                    <Pie
                      data={filteredPieData}
                      dataKey="value"
                      cx="50%"
                      cy="45%"
                      innerRadius={40}
                      outerRadius={60}
                      label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
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
                              stroke={currentTheme.name === 'light' ? '#9ca3af' : '#9ca3af'}
                              fill="none"
                              strokeWidth={1.5}
                            />
                            <text
                              x={textX}
                              y={textY}
                              fill={currentTheme.name === 'light' ? '#9ca3af' : '#9ca3af'}
                              fontSize={14}
                              fontWeight="500"
                              textAnchor={textAnchor}
                              dominantBaseline="middle"
                            >
                              {`${name} ${percentValue}%`}
                            </text>
                          </g>
                        );
                      }}
                      labelLine={false}
                    >
                      {filteredPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={currentTheme.colors.pie[entry.name] || "#818cf8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      margin={{ top: 20 }}
                      wrapperStyle={{ marginTop: "12px" }}
                      formatter={(value) => <span style={{ color: currentTheme.name === 'light' ? '#334155' : '#9ca3af' }}>{value}</span>}
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
          <button
            key={idx}
            onClick={() => scrollToCard(idx)}
            className={`h-2 rounded-full transition-all ${activeIndex === idx ? 'w-4' : 'w-2'}`}
            style={{
              backgroundColor: activeIndex === idx ? accentColor : currentTheme.colors.borderLight.replace('border-', '')
            }}
          />
        ))}
      </div>
        </>
      ) : (
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-8 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} flex flex-col items-center justify-center`}>
          <div className="text-4xl mb-4">📊</div>
          <h3 className={`text-lg font-semibold ${currentTheme.colors.text} mb-2`}>暂无数据</h3>
          <p className={`text-sm ${currentTheme.colors.textLight} text-center`}>
            开始记录你的饮品，查看健康数据趋势
          </p>
        </div>
      )}
      <RecordList
        records={records}
        filterDate={filterDate}
        setFilterDate={setFilterDate}
        onEdit={onEdit}
        onDelete={onDelete}
        currentTheme={currentTheme}
        currentUiStyle={currentUiStyle}
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
  setProfile,
  customDrinks,
  onAddCustomDrink,
  onEditCustomDrink,
  onDeleteCustomDrink,
  ingredients,
  onAddIngredient,
  onEditIngredient,
  onDeleteIngredient,
  theme,
  setTheme,
  uiStyle,
  setUiStyle,
  accentColor,
  setAccentColor,
  currentTheme,
  currentUiStyle,
  getContrastColor
}) => {
  // 通用处理函数
  const handleLimitChange = (value, setter, min, max, defaultValue) => {
    if (value === "") {
      // 当用户清空输入时，设置为 0
      setter(0);
      return;
    }
    const num = Number(value);
    if (isNaN(num)) {
      setter(defaultValue);
      return;
    }
    setter(Math.min(max, Math.max(min, num)));
  };

  const handleDailyLimitBlur = (e) => {
    handleLimitChange(e.target.value, setDailyLimit, 0, 800, 300);
  };

  const handleDailyAlcoholLimitBlur = (e) => {
    handleLimitChange(e.target.value, setDailyAlcoholLimit, 0, 50000, 14000);
  };

  const handleDailyWaterTargetBlur = (e) => {
    handleLimitChange(e.target.value, setDailyWaterTarget, 0, 5000, 2000);
  };

  const handleDailySugarLimitBlur = (e) => {
    handleLimitChange(e.target.value, setDailySugarLimit, 0, 200, 50);
  };

  const handleDailyCaloriesLimitBlur = (e) => {
    handleLimitChange(e.target.value, setDailyCaloriesLimit, 0, 5000, 2000);
  };

  const handleDailyFatLimitBlur = (e) => {
    handleLimitChange(e.target.value, setDailyFatLimit, 0, 200, 70);
  };

  const genderOptions = ["未设置", "男", "女"];
  const handleGenderChange = (gender) => {
    setProfile(prev => ({ ...prev, gender }));
  };

  try {
    return (
      <section className="space-y-4">
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>👤 个人信息</h2>
            <button
              className={`rounded-md border ${currentTheme.colors.border} px-2 py-1 text-xs ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:bg-slate-100`}
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
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
                style={{
                  backgroundColor: `${accentColor}40`,
                  color: getContrastColor(accentColor)
                }}
              >
                {profile.avatar || "Y"}
              </div>
            )}
            <div>
              <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{profile.nickname || "未命名用户"}</p>
              {profile.bio ? <p className={`text-xs ${currentTheme.colors.textLight}`}>{profile.bio}</p> : null}
            </div>
          </div>
          <p className={`mt-2 text-xs ${currentTheme.colors.textLight}`}>已连续记录 {streakDays} 天</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {Number(profile.age) > 0 ? <span className={currentTheme.colors.textLight}>年龄：{profile.age}</span> : null}
            {Number(profile.weight) > 0 ? <span className={currentTheme.colors.textLight}>体重：{profile.weight} kg</span> : null}
            {Number(profile.bloodSugar) > 0 ? <span className={currentTheme.colors.textLight}>血糖：{profile.bloodSugar} mmol/L</span> : null}
            {profile.gender && profile.gender !== "未设置" ? <span className={currentTheme.colors.textLight}>性别：{profile.gender}</span> : null}
          </div>

          {isEditingProfile && (
            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
              <ProfileEditor
                profile={profile}
                setProfile={setProfile}
                onAvatarUpload={onAvatarUpload}
                currentTheme={currentTheme}
                currentUiStyle={currentUiStyle}
                accentColor={accentColor}
                getContrastColor={getContrastColor}
              />
              <div>
                <label className={`block text-xs ${currentTheme.colors.textSecondary} mb-1`}>性别</label>
                <div className="flex gap-2">
                  {genderOptions.map(opt => (
                    <button
                    key={opt}
                    onClick={() => handleGenderChange(opt)}
                    className={`flex-1 py-2 rounded-lg border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                    style={{
                      backgroundColor: profile.gender === opt ? accentColor : currentTheme.colors.cardColor,
                      color: profile.gender === opt ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                      borderColor: profile.gender === opt ? accentColor : currentTheme.colors.borderColor
                    }}
                  >
                    {opt}
                  </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-5 gap-2 text-center">
            <div className={`rounded-lg ${currentTheme.colors.card} py-2 ${currentTheme.colors.border}`}>
              <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{recordsCount}</p>
              <p className={`text-xs ${currentTheme.colors.textLight}`}>总杯数</p>
            </div>
            <div className={`rounded-lg ${currentTheme.colors.card} py-2 ${currentTheme.colors.border}`}>
              <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{coffeeCount}</p>
              <p className={`text-xs ${currentTheme.colors.textLight}`}>咖啡</p>
            </div>
            <div className={`rounded-lg ${currentTheme.colors.card} py-2 ${currentTheme.colors.border}`}>
              <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{milkTeaCount}</p>
              <p className={`text-xs ${currentTheme.colors.textLight}`}>奶茶</p>
            </div>
            <div className={`rounded-lg ${currentTheme.colors.card} py-2 ${currentTheme.colors.border}`}>
              <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{alcoholCount}</p>
              <p className={`text-xs ${currentTheme.colors.textLight}`}>酒</p>
            </div>
            <div className={`rounded-lg ${currentTheme.colors.card} py-2 ${currentTheme.colors.border}`}>
              <p className={`text-base font-semibold ${currentTheme.colors.text}`}>{waterCount}</p>
              <p className={`text-xs ${currentTheme.colors.textLight}`}>水</p>
            </div>
          </div>
        </div>

        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
          <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>⚙️ 个人设置</h2>
          <p className={`mt-2 text-xs ${currentTheme.colors.textLight}`}>设置每日摄入咖啡因、酒精、糖分、热量、脂肪上限和喝水目标。</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日咖啡因上限（mg）
              <input
                type="text"
                inputMode="numeric"
                value={dailyLimit === 0 ? "" : dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailyLimitBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日酒精上限（mg）
              <input
                type="text"
                inputMode="numeric"
                value={dailyAlcoholLimit === 0 ? "" : dailyAlcoholLimit}
                onChange={(e) => setDailyAlcoholLimit(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailyAlcoholLimitBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日喝水目标（ml）
              <input
                type="text"
                inputMode="numeric"
                value={dailyWaterTarget === 0 ? "" : dailyWaterTarget}
                onChange={(e) => setDailyWaterTarget(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailyWaterTargetBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日糖分上限（g）
              <input
                type="text"
                inputMode="numeric"
                value={dailySugarLimit === 0 ? "" : dailySugarLimit}
                onChange={(e) => setDailySugarLimit(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailySugarLimitBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日热量上限（kcal）
              <input
                type="text"
                inputMode="numeric"
                value={dailyCaloriesLimit === 0 ? "" : dailyCaloriesLimit}
                onChange={(e) => setDailyCaloriesLimit(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailyCaloriesLimitBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
            <label className={`block text-sm ${currentTheme.colors.textSecondary}`}>
              每日脂肪上限（g）
              <input
                type="text"
                inputMode="numeric"
                value={dailyFatLimit === 0 ? "" : dailyFatLimit}
                onChange={(e) => setDailyFatLimit(e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : 0)}
                onBlur={handleDailyFatLimitBlur}
                className={`mt-1 w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </label>
          </div>
        </div>

        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mt-4 transition-all duration-300`}>
          <CustomDrinkManager
          customDrinks={customDrinks}
          onAdd={onAddCustomDrink}
          onEdit={onEditCustomDrink}
          onDelete={onDeleteCustomDrink}
          currentTheme={currentTheme}
          currentUiStyle={currentUiStyle}
          accentColor={accentColor}
        />
        </div>

        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mt-4 transition-all duration-300`}>
          <IngredientManager
          ingredients={ingredients}
          onAdd={onAddIngredient}
          onEdit={onEditIngredient}
          onDelete={onDeleteIngredient}
          currentTheme={currentTheme}
          currentUiStyle={currentUiStyle}
          accentColor={accentColor}
        />
        </div>

        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mt-4 transition-all duration-300`}>
          <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>🎨 个性化设置</h2>
          <p className={`mt-2 text-xs ${currentTheme.colors.textLight}`}>自定义应用的外观和风格。</p>
          
          <div className="mt-4 space-y-4">
            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>主题模式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: theme === 'light' ? accentColor : currentTheme.colors.cardColor,
                    color: theme === 'light' ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                    borderColor: theme === 'light' ? accentColor : currentTheme.colors.borderColor
                  }}
                >
                  浅色模式
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: theme === 'dark' ? accentColor : currentTheme.colors.cardColor,
                    color: theme === 'dark' ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                    borderColor: theme === 'dark' ? accentColor : currentTheme.colors.borderColor
                  }}
                >
                  深色模式
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>UI风格</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setUiStyle('default')}
                  className={`py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: uiStyle === 'default' ? accentColor : currentTheme.colors.cardColor,
                    color: uiStyle === 'default' ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                    borderColor: uiStyle === 'default' ? accentColor : currentTheme.colors.borderColor
                  }}
                >
                  默认风格
                </button>
                <button
                  onClick={() => setUiStyle('pixel')}
                  className={`py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: uiStyle === 'pixel' ? accentColor : currentTheme.colors.cardColor,
                    color: uiStyle === 'pixel' ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                    borderColor: uiStyle === 'pixel' ? accentColor : currentTheme.colors.borderColor
                  }}
                >
                  像素风格
                </button>
                <button
                  onClick={() => setUiStyle('apple')}
                  className={`py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: uiStyle === 'apple' ? accentColor : currentTheme.colors.cardColor,
                    color: uiStyle === 'apple' ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                    borderColor: uiStyle === 'apple' ? accentColor : currentTheme.colors.borderColor
                  }}
                >
                  苹果风格
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>个性化颜色</label>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 overflow-hidden">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 w-full h-full cursor-pointer"
                    style={{ appearance: 'none', border: 'none' }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className={`w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
                    placeholder="输入颜色代码"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            className="w-full rounded-xl py-2 text-sm active:scale-95 transition-transform"
            style={{
              backgroundColor: `${accentColor}40`,
              borderColor: accentColor,
              borderWidth: "1px",
              borderStyle: "solid",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              color: getContrastColor(accentColor)
            }}
            onClick={onExportCsv}
          >
            📤 导出 CSV 记录
          </button>
          <button
            className={`w-full rounded-xl border ${currentTheme.colors.dangerBorder} ${currentTheme.colors.danger} py-2 text-sm text-rose-600 active:scale-95 transition-transform`}
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
  } catch (error) {
    console.error('SettingsTab error:', error);
    return (
      <section className="space-y-4 p-4">
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
          <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>⚠️ 加载失败</h2>
          <p className={`mt-2 text-sm ${currentTheme.colors.textSecondary}`}>个人设置页面加载时发生错误，请刷新页面重试。</p>
        </div>
      </section>
    );
  }
};

const CustomDrinkEditor = ({ drink, onSave, onCancel, currentTheme, accentColor }) => {
  const [name, setName] = useState(drink?.name || "");
  const [caffeine, setCaffeine] = useState(drink?.caffeine?.toString() || "");
  const [sugar, setSugar] = useState(drink?.sugar?.toString() || "");
  const [calories, setCalories] = useState(drink?.calories?.toString() || "");
  const [fat, setFat] = useState(drink?.fat?.toString() || "");

  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入饮品名称");
      return;
    }
    onSave({
      name: name.trim(),
      caffeine,
      sugar,
      calories,
      fat
    });
  };

  return (
    <div className="space-y-3">
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        饮品名称
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
          placeholder="例如：蜂蜜茶"
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        咖啡因含量（mg）
        <input
          type="number"
          min="0"
          value={caffeine}
          onChange={(e) => setCaffeine(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        糖分含量（g）
        <input
          type="number"
          min="0"
          value={sugar}
          onChange={(e) => setSugar(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        热量含量（kcal）
        <input
          type="number"
          min="0"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        脂肪含量（g）
        <input
          type="number"
          min="0"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className={`flex-1 py-2 rounded-lg ${currentTheme.colors.card} ${currentTheme.colors.textSecondary} text-sm ${currentTheme.colors.border}`}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 py-2 rounded-lg text-sm`}
          style={{
            backgroundColor: accentColor,
            color: getContrastColor(accentColor)
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
};

const CustomDrinkManager = ({ customDrinks, onAdd, onEdit, onDelete, currentTheme, currentUiStyle, accentColor }) => {
  const [editingDrink, setEditingDrink] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleAdd = () => {
    setEditingDrink(null);
    setShowEditor(true);
  };

  const handleEdit = (drink) => {
    setEditingDrink(drink);
    setShowEditor(true);
  };

  const handleSave = (drinkData) => {
    if (editingDrink) {
      onEdit(editingDrink.id, drinkData);
    } else {
      onAdd(drinkData);
    }
    setShowEditor(false);
    setEditingDrink(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className={`text-sm font-medium ${currentTheme.colors.text}`}>自定义饮品</h3>
        <button
          onClick={handleAdd}
          className={`text-xs hover:underline`}
          style={{
            color: accentColor
          }}
        >
          添加饮品
        </button>
      </div>
      {customDrinks.length === 0 ? (
        <p className={`text-xs ${currentTheme.colors.textLight}`}>暂无自定义饮品</p>
      ) : (
        <div className="space-y-2">
          {customDrinks.map((drink) => (
            <div key={drink.id} className={`flex justify-between items-center p-2 ${currentTheme.colors.card} rounded-lg ${currentTheme.colors.border}`}>
              <div>
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{drink.name}</p>
                <p className={`text-xs ${currentTheme.colors.textLight}`}>
                  咖啡因: {drink.caffeine}mg, 糖分: {drink.sugar}g, 热量: {drink.calories}kcal, 脂肪: {drink.fat}g
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(drink)}
                  className={`text-xs text-[${accentColor}] hover:underline`}
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(drink.id)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showEditor && (
        <div className={`mt-3 p-3 ${currentTheme.colors.card} rounded-lg ${currentTheme.colors.border}`}>
          <h4 className={`text-sm font-medium mb-2`} style={{ color: accentColor }}>
            {editingDrink ? "编辑饮品" : "添加自定义饮品"}
          </h4>
          <CustomDrinkEditor
            drink={editingDrink}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingDrink(null);
            }}
            currentTheme={currentTheme}
            accentColor={accentColor}
          />
        </div>
      )}
    </div>
  );
};

const IngredientEditor = ({ ingredient, onSave, onCancel, currentTheme, accentColor }) => {
  const [name, setName] = useState(ingredient?.name || "");
  const [caffeine, setCaffeine] = useState(ingredient?.caffeine?.toString() || "");
  const [sugar, setSugar] = useState(ingredient?.sugar?.toString() || "");
  const [calories, setCalories] = useState(ingredient?.calories?.toString() || "");
  const [fat, setFat] = useState(ingredient?.fat?.toString() || "");

  const handleSave = () => {
    if (!name.trim()) {
      alert("请输入配料名称");
      return;
    }
    onSave({
      name: name.trim(),
      caffeine,
      sugar,
      calories,
      fat
    });
  };

  return (
    <div className="space-y-3">
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        配料名称
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
          placeholder="例如：珍珠、奶盖"
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        咖啡因含量（mg）
        <input
          type="number"
          min="0"
          value={caffeine}
          onChange={(e) => setCaffeine(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        糖分含量（g）
        <input
          type="number"
          min="0"
          value={sugar}
          onChange={(e) => setSugar(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        热量含量（kcal）
        <input
          type="number"
          min="0"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
        脂肪含量（g）
        <input
          type="number"
          min="0"
          value={fat}
          onChange={(e) => setFat(e.target.value)}
          className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
        />
      </label>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className={`flex-1 py-2 rounded-lg ${currentTheme.colors.card} ${currentTheme.colors.textSecondary} text-sm ${currentTheme.colors.border}`}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          className={`flex-1 py-2 rounded-lg text-sm`}
          style={{
            backgroundColor: accentColor,
            color: getContrastColor(accentColor)
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
};

const IngredientManager = ({ ingredients, onAdd, onEdit, onDelete, currentTheme, currentUiStyle, accentColor }) => {
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleAdd = () => {
    setEditingIngredient(null);
    setShowEditor(true);
  };

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setShowEditor(true);
  };

  const handleSave = (ingredientData) => {
    if (editingIngredient) {
      onEdit(editingIngredient.id, ingredientData);
    } else {
      onAdd(ingredientData);
    }
    setShowEditor(false);
    setEditingIngredient(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className={`text-sm font-medium ${currentTheme.colors.text}`}>配料管理</h3>
        <button
          onClick={handleAdd}
          className={`text-xs hover:underline`}
          style={{
            color: accentColor
          }}
        >
          添加配料
        </button>
      </div>
      {ingredients.length === 0 ? (
        <p className={`text-xs ${currentTheme.colors.textLight}`}>暂无配料</p>
      ) : (
        <div className="space-y-2">
          {ingredients.map((ingredient) => (
            <div key={ingredient.id} className={`flex justify-between items-center p-2 ${currentTheme.colors.card} rounded-lg ${currentTheme.colors.border}`}>
              <div>
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{ingredient.name}</p>
                <p className={`text-xs ${currentTheme.colors.textLight}`}>
                  咖啡因: {ingredient.caffeine}mg, 糖分: {ingredient.sugar}g, 热量: {ingredient.calories}kcal, 脂肪: {ingredient.fat}g
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(ingredient)}
                  className={`text-xs text-[${accentColor}] hover:underline`}
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(ingredient.id)}
                  className="text-xs text-rose-500 hover:underline"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showEditor && (
        <div className={`mt-3 p-3 ${currentTheme.colors.card} rounded-lg ${currentTheme.colors.border}`}>
          <h4 className={`text-sm font-medium mb-2`} style={{ color: accentColor }}>
            {editingIngredient ? "编辑配料" : "添加配料"}
          </h4>
          <IngredientEditor
            ingredient={editingIngredient}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingIngredient(null);
            }}
            currentTheme={currentTheme}
            accentColor={accentColor}
          />
        </div>
      )}
    </div>
  );
};

const ProfileEditor = ({ profile, setProfile, onAvatarUpload, currentTheme, currentUiStyle, accentColor, getContrastColor }) => (
  <div className={`mt-4 space-y-3 rounded-xl ${currentTheme.colors.card} p-3 ${currentTheme.colors.border}`}>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
      头像 Emoji/字符（例如 😀、A、D）
      <input
        value={profile.avatar}
        onChange={(e) => setProfile((prev) => ({ ...prev, avatar: e.target.value }))}
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
      {String(profile.avatar || "").startsWith("data:image") && (
        <button
          onClick={() => setProfile((prev) => ({ ...prev, avatar: "" }))}
          className="mt-1 text-xs text-[#b08968] hover:underline"
        >
          使用 Emoji/字符
        </button>
      )}
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
      上传头像照片
      <input
        type="file"
        accept="image/*"
        onChange={onAvatarUpload}
        className={`mt-1 block w-full text-xs ${currentTheme.colors.textSecondary} file:mr-3 file:rounded-md file:border-0 file:bg-[${accentColor}40] file:px-3 file:py-2 file:text-xs file:text-[${getContrastColor(accentColor)}]`}
      />
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
      昵称
      <input
        value={profile.nickname}
        onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))}
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
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
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
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
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
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
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
    </label>
    <label className={`block text-xs ${currentTheme.colors.textSecondary}`}>
      个人简介
      <input
        value={profile.bio || ""}
        onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
        className={`mt-1 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
      />
    </label>
  </div>
);

const RecordList = ({ records, filterDate, setFilterDate, onEdit, onDelete, currentTheme, currentUiStyle }) => {
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
    <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>📚记录列表</h2>
        <button
          className={`rounded-md border ${currentTheme.colors.border} px-2 py-1 text-xs ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:bg-slate-100`}
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
          className={`w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
          style={{
            ...baseStyle,
            ...iosStyle,
            color: filterDate ? currentTheme.colors.text : (isIOS ? "transparent" : currentTheme.colors.text)
          }}
        />
        {isIOS && !filterDate && (
          <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textLight}`} style={{ lineHeight: "24px" }}>
            年/月/日
          </span>
        )}
      </div>

      {displayedRecords.length === 0 ? (
        <p className={`text-sm ${currentTheme.colors.textLight}`}>当前筛选下没有记录。</p>
      ) : (
        <>
          <ul className="space-y-2">
            {displayedRecords.map((r) => (
              <li key={r.id} className={`${currentUiStyle.cardRadius} ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 transition hover:bg-slate-200`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${currentTheme.colors.text}`}>
                      {r.type}
                    </p>
                    <p className={`text-xs ${currentTheme.colors.textLight}`}>
                      {getDetails(r)}
                    </p>
                    <p className={`text-xs ${currentTheme.colors.textLight}`}>
                      {dateToKey(r._date)} {r.time}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${currentTheme.colors.text}`}>{getValueDisplay(r)}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className={`rounded-md border ${currentTheme.colors.border} px-2 py-1 text-xs ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:bg-slate-200`}
                    onClick={() => onEdit(r)}
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    className={`rounded-md border ${currentTheme.colors.dangerBorder} px-2 py-1 text-xs text-rose-600 transition-colors duration-300 ${currentTheme.colors.danger}`}
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
              className={`mt-3 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} py-2 text-sm ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:bg-slate-200`}
            >
              加载更多 ({sortedRecords.length - DEFAULT_DISPLAY_LIMIT} 条)
            </button>
          )}
          {!shouldLimit && !filterDate && hasMore && (
            <button
              onClick={() => setShowAll(false)}
              className={`mt-3 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} py-2 text-sm ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:bg-slate-200`}
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
  customDrinks,
  ingredients,
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
  onCustomAmountChange,
  selectedIngredients = [],
  onIngredientsChange,
  currentTheme,
  currentUiStyle,
  accentColor
}) => {
  const [isIOS, setIsIOS] = useState(false);
  
  // 检测设备类型
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  if (!open) return null;

  const isCoffeeOrMilk = type === "咖啡" || type === "奶茶" || type === "茶" || type === "果汁" || type === "碳酸饮料";
  const isAlcohol = type === "酒";
  const isWater = type === "水";
  
  // 检查是否是自定义饮品
  const customDrink = customDrinks && customDrinks.find(drink => drink.name === type);

  // 获取默认数量值
  const getAmountDefault = () => {
    if (isAlcohol) return String(DEFAULT_ALCOHOL_MG);
    if (isWater) return String(DEFAULT_WATER_ML);
    return "";
  };

  const currentAmount = customAmount !== undefined ? customAmount : getAmountDefault();

  // 统一输入样式
  const inputStyle = {
    appearance: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    width: "100%",
    minWidth: 0,
    display: "block",
    ...(isIOS ? {
      lineHeight: "1.5",
      paddingTop: "8px",
      paddingBottom: "8px",
      height: "auto"
    } : {
      height: "40px",
      lineHeight: "24px"
    })
  };

  const inputClassName = `w-full ${currentUiStyle.buttonRadius} border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 text-sm outline-none ring-indigo-200 focus:ring`;

  // 处理日期输入点击
  const handleDateClick = (e) => {
    e.stopPropagation();
    const input = e.currentTarget.querySelector('input');
    if (input) {
      input.focus();
      // 尝试显示原生选择器
      if (input.showPicker) {
        try {
          input.showPicker();
        } catch (error) {
          // 忽略错误，使用默认行为
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/45" onClick={onClose}>
      <div className={`w-full ${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 shadow-2xl space-y-8 transition-colors duration-300 max-h-[80vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-base font-semibold ${currentTheme.colors.text}`}>选择饮品参数</h3>

        <div>
          <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>饮品类型</p>
          <div className="flex gap-2 flex-wrap">
            {DRINK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                style={{
                  backgroundColor: type === t ? accentColor : currentTheme.colors.cardColor,
                  color: type === t ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: type === t ? accentColor : currentTheme.colors.borderColor
                }}
              >
                {t}
              </button>
            ))}
            {customDrinks && customDrinks.length > 0 && (
              <button
                key="custom"
                onClick={() => onTypeChange("自定义")}
                className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                style={{
                  backgroundColor: type === "自定义" ? accentColor : currentTheme.colors.cardColor,
                  color: type === "自定义" ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: type === "自定义" ? accentColor : currentTheme.colors.borderColor
                }}
              >
                自定义
              </button>
            )}
          </div>
          {type === "自定义" && customDrinks && customDrinks.length > 0 && (
            <div className="mt-3">
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>选择自定义饮品</p>
              <div className="flex gap-2 flex-wrap">
                {customDrinks.map((drink) => (
                  <button
                    key={drink.id}
                    onClick={() => onTypeChange(drink.name)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: type === drink.name ? accentColor : currentTheme.colors.cardColor,
                  color: type === drink.name ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: type === drink.name ? accentColor : currentTheme.colors.borderColor
                }}
                  >
                    {drink.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCoffeeOrMilk && (
          <>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>杯型</p>
              <div className="flex gap-2">
                {CUP_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => onCupSizeChange(s)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: cupSize === s ? accentColor : currentTheme.colors.cardColor,
                  color: cupSize === s ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: cupSize === s ? accentColor : currentTheme.colors.borderColor
                }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>冰度</p>
              <div className="flex gap-2">
                {ICE_OPTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => onIceChange(i)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: ice === i ? accentColor : currentTheme.colors.cardColor,
                  color: ice === i ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: ice === i ? accentColor : currentTheme.colors.borderColor
                }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>糖度</p>
              <div className="flex gap-2">
                {SUGAR_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSugarChange(s)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: sugar === s ? accentColor : currentTheme.colors.cardColor,
                  color: sugar === s ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: sugar === s ? accentColor : currentTheme.colors.borderColor
                }}
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
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>冰度</p>
              <div className="flex gap-2">
                {ALCOHOL_ICE_OPTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => onAlcoholIceChange(i)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: alcoholIce === i ? accentColor : currentTheme.colors.cardColor,
                  color: alcoholIce === i ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: alcoholIce === i ? accentColor : currentTheme.colors.borderColor
                }}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>酒精含量 (mg)</p>
              <input
                type="number"
                step="100"
                value={currentAmount}
                onChange={(e) => onCustomAmountChange(e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
          </>
        )}

        {isWater && (
          <>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>冷暖</p>
              <div className="flex gap-2">
                {WATER_TEMP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => onWaterTempChange(t)}
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                    style={{
                  backgroundColor: waterTemp === t ? accentColor : currentTheme.colors.cardColor,
                  color: waterTemp === t ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                  borderColor: waterTemp === t ? accentColor : currentTheme.colors.borderColor
                }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>饮水量 (ml)</p>
              <input
                type="number"
                step="50"
                value={currentAmount}
                onChange={(e) => onCustomAmountChange(e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* 配料选择 */}
        {(isCoffeeOrMilk || customDrink) && ingredients && ingredients.length > 0 && (
          <div>
            <p className={`mb-2 text-sm`} style={{ color: accentColor }}>添加配料</p>
            <div className="flex gap-2 flex-wrap">
              {ingredients.map((ingredient) => (
                <button
                  key={ingredient.id}
                  onClick={() => {
                    if (onIngredientsChange) {
                      const isSelected = selectedIngredients.some(item => item.id === ingredient.id);
                      if (isSelected) {
                        onIngredientsChange(selectedIngredients.filter(item => item.id !== ingredient.id));
                      } else {
                        onIngredientsChange([...selectedIngredients, ingredient]);
                      }
                    }
                  }}
                  className={`py-2 px-3 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border}`}
                  style={{
                    backgroundColor: selectedIngredients.some(item => item.id === ingredient.id) ? accentColor : currentTheme.colors.card.replace('bg-', ''),
                    color: selectedIngredients.some(item => item.id === ingredient.id) ? getContrastColor(accentColor) : currentTheme.colors.textSecondary.replace('text-', ''),
                    borderColor: selectedIngredients.some(item => item.id === ingredient.id) ? accentColor : currentTheme.colors.border.replace('border-', '')
                  }}
                >
                  {ingredient.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {time !== undefined && (
          <>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>日期</p>
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
                    ...inputStyle,
                    color: date ? "inherit" : (isIOS ? "transparent" : "inherit")
                  }}
                />
                {isIOS && !date && (
                  <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${currentTheme.colors.textLight}`} style={{ lineHeight: "24px" }}>
                    年/月/日
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>时间</p>
              <input
                type="time"
                value={time}
                onChange={(e) => onTimeChange(e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className={`flex-1 py-2 ${currentUiStyle.buttonRadius} ${currentTheme.colors.border} ${currentTheme.colors.card} ${currentTheme.colors.textLight} active:scale-95 transition hover:bg-slate-200`}>
            取消
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-2 ${currentUiStyle.buttonRadius} active:scale-95 transition hover:bg-opacity-90`}
            style={{
              backgroundColor: accentColor,
              color: getContrastColor(accentColor)
            }}
          >
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
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? JSON.parse(saved).theme : 'light';
    } catch {
      return 'light';
    }
  });
  const [uiStyle, setUiStyle] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? JSON.parse(saved).uiStyle : 'default';
    } catch {
      return 'default';
    }
  });
  const [accentColor, setAccentColor] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? JSON.parse(saved).accentColor : '#b08968';
    } catch {
      return '#b08968';
    }
  });
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

  // 自定义饮品
  const [customDrinks, setCustomDrinks] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_DRINKS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 配料管理
  const [ingredients, setIngredients] = useState(() => {
    try {
      const saved = localStorage.getItem(INGREDIENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 获取当前主题配置
  const currentTheme = THEMES[theme];
  const currentUiStyle = UI_STYLES[uiStyle];

  // 保存主题设置
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify({
      theme,
      uiStyle,
      accentColor
    }));
  }, [theme, uiStyle, accentColor]);

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
    date: "",
    selectedIngredients: []
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

  // 标准化记录：统一处理日期格式
  const normalizedRecords = useMemo(() =>
    records.map((r) => {
      let recordDate;

      // 优先使用存储的 _date 字符串（YYYY-MM-DD）
      if (r._date && typeof r._date === 'string' && r._date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = r._date.split('-');
        const [hours, minutes] = r.time ? r.time.split(':') : ['0', '0'];
        recordDate = new Date(year, month-1, day, hours, minutes);
      } 
      // 兼容旧数据：使用 createdAt
      else if (r.createdAt) {
        recordDate = new Date(r.createdAt);
      } 
      // 兼容其他格式
      else if (r._date) {
        recordDate = typeof r._date === 'string' ? new Date(r._date) : r._date;
        if (r.time) {
          const [hours, minutes] = r.time.split(':');
          recordDate.setHours(hours, minutes, 0, 0);
        }
      } else {
        recordDate = new Date();
      }

      // 确保日期对象有效
      if (isNaN(recordDate.getTime())) {
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

  // 使用 useMemo 缓存计算结果
  const { totalCaffeine, totalAlcohol, totalWater, totalSugar, totalCalories, totalFat } = useMemo(() => {
    let caffeine = 0;
    let alcohol = 0;
    let water = 0;
    let sugar = 0;
    let calories = 0;
    let fat = 0;

    for (const r of todayRecords) {
      caffeine += r.caffeine || 0;
      alcohol += r.alcohol || 0;
      water += r.water || 0;
      sugar += r.sugar_g || 0;
      calories += r.calories_kcal || 0;
      fat += r.fat_g || 0;
    }

    return {
      totalCaffeine: caffeine,
      totalAlcohol: alcohol,
      totalWater: water,
      totalSugar: sugar,
      totalCalories: calories,
      totalFat: fat
    };
  }, [todayRecords]);

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
  useEffect(() => {
    localStorage.setItem(CUSTOM_DRINKS_KEY, JSON.stringify(customDrinks));
  }, [customDrinks]);
  useEffect(() => {
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
  }, [ingredients]);
  
  // 保存主题设置
  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify({ theme, uiStyle, accentColor }));
  }, [theme, uiStyle, accentColor]);

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
        date: recordDate,
        selectedIngredients: existingRecord.selectedIngredients || []
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
        date: todayDate,
        selectedIngredients: []
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

    // 统一使用 ISO 日期字符串格式
    const normalizedDate = finalDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const createdAtISO = finalDate.toISOString();
    const newTime = pickerState.time || `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    // 检查是否是自定义饮品
    const customDrink = customDrinks.find(drink => drink.name === pickerState.type);

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
            _date: normalizedDate   // 统一存储为 ISO 日期字符串
          };
          
          let nutrition;
          if (customDrink) {
            // 使用自定义饮品的营养成分
            nutrition = {
              caffeine: customDrink.caffeine,
              sugar_g: customDrink.sugar,
              calories_kcal: customDrink.calories,
              fat_g: customDrink.fat,
              alcohol: 0,
              water: 0
            };
          } else {
            // 使用通用函数计算营养成分
            nutrition = calculateNutrition(
              pickerState.type,
              pickerState.cupSize,
              pickerState.sugar,
              pickerState.customAmount
            );
          }
          
          // 添加配料的营养成分
          if (pickerState.selectedIngredients && pickerState.selectedIngredients.length > 0) {
            pickerState.selectedIngredients.forEach(ingredient => {
              nutrition.caffeine += ingredient.caffeine;
              nutrition.sugar_g += ingredient.sugar;
              nutrition.calories_kcal += ingredient.calories;
              nutrition.fat_g += ingredient.fat;
            });
          }
          
          if (pickerState.type === "咖啡" || pickerState.type === "奶茶" || pickerState.type === "茶" || pickerState.type === "果汁" || pickerState.type === "碳酸饮料" || customDrink) {
            return {
              ...base,
              cupSize: pickerState.cupSize,
              ice: pickerState.ice,
              sugar: pickerState.sugar,
              selectedIngredients: pickerState.selectedIngredients,
              ...nutrition
            };
          } else if (pickerState.type === "酒") {
            return {
              ...base,
              alcoholIce: pickerState.alcoholIce,
              selectedIngredients: pickerState.selectedIngredients,
              ...nutrition
            };
          } else if (pickerState.type === "水") {
            return {
              ...base,
              waterTemp: pickerState.waterTemp,
              selectedIngredients: pickerState.selectedIngredients,
              ...nutrition
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
        _date: normalizedDate   // 统一存储为 ISO 日期字符串
      };
      
      let nutrition;
      if (customDrink) {
        // 使用自定义饮品的营养成分
        nutrition = {
          caffeine: customDrink.caffeine,
          sugar_g: customDrink.sugar,
          calories_kcal: customDrink.calories,
          fat_g: customDrink.fat,
          alcohol: 0,
          water: 0
        };
      } else {
        // 使用通用函数计算营养成分
        nutrition = calculateNutrition(
          pickerState.type,
          pickerState.cupSize,
          pickerState.sugar,
          pickerState.customAmount
        );
      }
      
      // 添加配料的营养成分
      if (pickerState.selectedIngredients && pickerState.selectedIngredients.length > 0) {
        pickerState.selectedIngredients.forEach(ingredient => {
          nutrition.caffeine += ingredient.caffeine;
          nutrition.sugar_g += ingredient.sugar;
          nutrition.calories_kcal += ingredient.calories;
          nutrition.fat_g += ingredient.fat;
        });
      }
      
      if (pickerState.type === "咖啡" || pickerState.type === "奶茶" || pickerState.type === "茶" || pickerState.type === "果汁" || pickerState.type === "碳酸饮料" || customDrink) {
        newRecord = {
          ...newRecord,
          cupSize: pickerState.cupSize,
          ice: pickerState.ice,
          sugar: pickerState.sugar,
          selectedIngredients: pickerState.selectedIngredients,
          ...nutrition
        };
      } else if (pickerState.type === "酒") {
        newRecord = {
          ...newRecord,
          alcoholIce: pickerState.alcoholIce,
          selectedIngredients: pickerState.selectedIngredients,
          ...nutrition
        };
      } else if (pickerState.type === "水") {
        newRecord = {
          ...newRecord,
          waterTemp: pickerState.waterTemp,
          selectedIngredients: pickerState.selectedIngredients,
          ...nutrition
        };
      }
      setRecords((prev) => [newRecord, ...prev]);
    }
    closePicker();
  }, [editingId, pickerState, closePicker, customDrinks]);

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

  // 自定义饮品管理
  const addCustomDrink = (drink) => {
    setCustomDrinks(prev => [...prev, {
      id: Date.now().toString(),
      name: drink.name,
      caffeine: Number(drink.caffeine) || 0,
      sugar: Number(drink.sugar) || 0,
      calories: Number(drink.calories) || 0,
      fat: Number(drink.fat) || 0
    }]);
  };

  const editCustomDrink = (id, updatedDrink) => {
    setCustomDrinks(prev => prev.map(drink => 
      drink.id === id ? {
        ...drink,
        name: updatedDrink.name,
        caffeine: Number(updatedDrink.caffeine) || 0,
        sugar: Number(updatedDrink.sugar) || 0,
        calories: Number(updatedDrink.calories) || 0,
        fat: Number(updatedDrink.fat) || 0
      } : drink
    ));
  };

  const deleteCustomDrink = (id) => {
    setCustomDrinks(prev => prev.filter(drink => drink.id !== id));
  };

  // 配料管理
  const addIngredient = (ingredient) => {
    setIngredients(prev => [...prev, {
      id: Date.now().toString(),
      name: ingredient.name,
      caffeine: Number(ingredient.caffeine) || 0,
      sugar: Number(ingredient.sugar) || 0,
      calories: Number(ingredient.calories) || 0,
      fat: Number(ingredient.fat) || 0
    }]);
  };

  const editIngredient = (id, updatedIngredient) => {
    setIngredients(prev => prev.map(ingredient => 
      ingredient.id === id ? {
        ...ingredient,
        name: updatedIngredient.name,
        caffeine: Number(updatedIngredient.caffeine) || 0,
        sugar: Number(updatedIngredient.sugar) || 0,
        calories: Number(updatedIngredient.calories) || 0,
        fat: Number(updatedIngredient.fat) || 0
      } : ingredient
    ));
  };

  const deleteIngredient = (id) => {
    setIngredients(prev => prev.filter(ingredient => ingredient.id !== id));
  };

  return (
    <div className={`mx-auto flex min-h-screen w-full max-w-md flex-col transition-colors duration-300 ${currentTheme.colors.background} ${theme === 'dark' ? 'dark' : ''}`}>
      <header className={`sticky top-0 z-10 backdrop-blur transition-colors duration-300 ${currentTheme.colors.border} ${currentTheme.colors.card} py-4`}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }} className={`text-2xl transition-colors duration-300 ${currentTheme.colors.text} text-center`}>
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
            currentTheme={currentTheme}
            currentUiStyle={currentUiStyle}
            accentColor={accentColor}
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
            currentTheme={currentTheme}
            currentUiStyle={currentUiStyle}
            accentColor={accentColor}
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
            customDrinks={customDrinks}
            onAddCustomDrink={addCustomDrink}
            onEditCustomDrink={editCustomDrink}
            onDeleteCustomDrink={deleteCustomDrink}
            ingredients={ingredients}
            onAddIngredient={addIngredient}
            onEditIngredient={editIngredient}
            onDeleteIngredient={deleteIngredient}
            theme={theme}
            setTheme={setTheme}
            uiStyle={uiStyle}
            setUiStyle={setUiStyle}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            currentTheme={currentTheme}
            currentUiStyle={currentUiStyle}
            getContrastColor={getContrastColor}
          />
        )}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-md backdrop-blur transition-colors duration-300 ${currentTheme.colors.border} ${currentTheme.colors.card}`}>
        {TABS.map((tab) => (
          <button
              key={tab}
              className={`flex-1 py-2 text-xs font-medium transition-colors duration-300 ${
                activeTab === tab ? `text-[${accentColor}]` : currentTheme.colors.textLight
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
        onTypeChange={(type) => setPickerState((prev) => ({ ...prev, type, selectedIngredients: [] }))}
        onIceChange={(ice) => setPickerState((prev) => ({ ...prev, ice }))}
        onSugarChange={(sugar) => setPickerState((prev) => ({ ...prev, sugar }))}
        onCupSizeChange={(cupSize) => setPickerState((prev) => ({ ...prev, cupSize }))}
        onAlcoholIceChange={(alcoholIce) => setPickerState((prev) => ({ ...prev, alcoholIce }))}
        onWaterTempChange={(waterTemp) => setPickerState((prev) => ({ ...prev, waterTemp }))}
        onTimeChange={(time) => setPickerState((prev) => ({ ...prev, time }))}
        onDateChange={(date) => setPickerState((prev) => ({ ...prev, date }))}
        onCustomAmountChange={(amount) => setPickerState((prev) => ({ ...prev, customAmount: amount }))}
        ingredients={ingredients}
        selectedIngredients={pickerState.selectedIngredients}
        onIngredientsChange={(ingredients) => setPickerState((prev) => ({ ...prev, selectedIngredients: ingredients }))}
        currentTheme={currentTheme}
        currentUiStyle={currentUiStyle}
        accentColor={accentColor}
      />
    </div>
  );
}

export default App;