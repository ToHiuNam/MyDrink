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

// 常量配置
const TABS = ["记录", "数据趋势", "个人设置"];
const TAB_ICONS = { 记录: "📝", 数据趋势: "📈", 个人设置: "⚙️" };
const TREND_RANGES = ["今日", "本周", "本月", "本年", "近7天"];
const STORAGE_KEY = "mydrink-records-v1";
const SETTINGS_KEY = "mydrink-settings-v1";
const PROFILE_KEY = "mydrink-profile-v1";
const CUSTOM_DRINKS_KEY = "mydrink-custom-drinks-v1";
const INGREDIENTS_KEY = "mydrink-ingredients-v1";
const THEME_KEY = "mydrink-theme-v1";
const SLEEP_KEY = "mydrink-sleep-v1";
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
const SUGAR_BASE = { 咖啡: 5, 奶茶: 10, 茶: 5, 果汁: 15, 碳酸饮料: 12 };
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

// 计算距离 bedtime 的小时数
const calculateHoursToBedtime = (currentTime, bedtime) => {
  const [bedHour, bedMinute] = bedtime.split(':').map(Number);
  const bedTime = new Date(currentTime);
  bedTime.setHours(bedHour, bedMinute, 0, 0);
  
  // 如果 bedtime 已经过了，计算到第二天的 bedtime
  if (bedTime < currentTime) {
    bedTime.setDate(bedTime.getDate() + 1);
  }
  
  const diffMs = bedTime - currentTime;
  return diffMs / (1000 * 60 * 60);
};

// 智能建议算法
const getCaffeineAdvice = (currentTime, remainingCaffeine, sleepData) => {
  const hoursToBed = calculateHoursToBedtime(currentTime, sleepData.usualBedtime);
  
  // 根据咖啡因敏感度调整阈值
  const sensitivityMultiplier = {
    low: 1.5,
    medium: 1.0,
    high: 0.5
  }[sleepData.sensitivityToCaffeine];
  
  const adjustedThreshold = 100 * sensitivityMultiplier;
  
  if (hoursToBed < 6 && remainingCaffeine > adjustedThreshold) {
    return {
      level: 'warning',
      message: `距离入睡还有 ${hoursToBed.toFixed(1)} 小时，当前咖啡因可能影响睡眠质量`,
      action: '建议改喝低咖啡因饮品或热牛奶',
      alternativeDrinks: ['低因咖啡', '热牛奶', '洋甘菊茶']
    };
  }
  
  const currentHour = currentTime.getHours();
  // 下午能量低谷期（14:00-16:00）
  if (currentHour >= 14 && currentHour < 16 && remainingCaffeine < 50) {
    return {
      level: 'info',
      message: '下午能量低谷期，适量咖啡因可提升专注力',
      action: '建议摄入 50-100mg 咖啡因',
      idealIntake: 75
    };
  }
  
  // 早晨（6:00-10:00）
  if (currentHour >= 6 && currentHour < 10 && remainingCaffeine < 100) {
    return {
      level: 'info',
      message: '早晨是摄入咖啡因的理想时段',
      action: '适量咖啡因可帮助唤醒身体，提升一天的精神状态',
      idealIntake: 100
    };
  }
  
  return null;
};

// 环形进度条组件
const CircularProgress = ({ value, max, size = 80, strokeWidth = 8, color = '#3b82f6', backgroundColor = '#e5e7eb' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{value}</div>
        <div style={{ fontSize: '10px', opacity: 0.7 }}>mg</div>
      </div>
    </div>
  );
};

const PIE_COLORS = COLORS.pie;

// ==================== 辅助函数 ====================

// 计算记录的营养成分
const calculateNutrition = (type, cupSize, sugar, customAmount) => {
  if (type === "咖啡" || type === "奶茶" || type === "茶" || type === "果汁" || type === "碳酸饮料") {
    const multiplier = CUP_MULTIPLIER[cupSize] || 1.0;
    const baseCaffeine = CAFFEINE_BASE[type] || 0;
    const caffeine = Math.round(baseCaffeine * multiplier);
    const sugarMultiplier = SUGAR_MULTIPLIER[sugar] || 1.0;
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
  currentUiStyle,
  sleepData
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState({
    advice: false,
    trends: false
  });

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

  // 获取咖啡因环形进度条的颜色
  const getCaffeineProgressColor = useMemo(() => {
    const currentHour = currentTime.getHours();
    const hoursToBed = calculateHoursToBedtime(currentTime, sleepData.usualBedtime);
    
    // 根据时间和距离睡眠时间调整颜色
    if (currentHour >= 18 || hoursToBed < 4) {
      // 晚上或接近睡眠时间，使用红色系
      if (caffeineRemaining > 100) {
        return '#ef4444'; // 红色
      } else if (caffeineRemaining > 50) {
        return '#f97316'; // 橙色
      }
    } else if (currentHour >= 14 && currentHour < 16) {
      // 下午能量低谷期，使用橙色系
      return '#f97316'; // 橙色
    } else if (currentHour >= 6 && currentHour < 12) {
      // 早晨，使用绿色系
      return '#22c55e'; // 绿色
    }
    // 默认颜色
    return '#3b82f6'; // 蓝色
  }, [currentTime, caffeineRemaining, sleepData]);

  // 咖啡因提醒和智能建议
  const caffeineInfo = useMemo(() => {
    if (caffeineRemaining === 0) {
      return {
        message: "今日无咖啡因摄入",
        advice: null
      };
    }
    
    const currentHour = currentTime.getHours();
    let message = `💪 体内咖啡因剩余约 ${caffeineRemaining} mg，${caffeineRemaining > 100 ? "含量较高" : "在正常范围"}。`;
    
    // 获取智能建议
    const advice = getCaffeineAdvice(currentTime, caffeineRemaining, sleepData);
    
    if (currentHour >= 20 && caffeineRemaining > 50) {
      message = `⚠️ 当前体内约含 ${caffeineRemaining} mg 咖啡因，可能影响睡眠，建议今晚避免再摄入。`;
    }
    
    return {
      message,
      advice
    };
  }, [caffeineRemaining, currentTime, sleepData]);

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

  // 切换展开/折叠状态
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mb-4 transition-all duration-300`}>
      <h3 className={`text-base font-semibold ${currentTheme.colors.text} mb-4`}>💡 健康助手</h3>

      {/* 核心提醒区域 */}
      <div className="space-y-4 mb-4">
        {/* 补水提醒 */}
        {waterReminder && (
          <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-blue-50 to-blue-100 p-3 ring-1 ring-blue-200 transition-all duration-300 hover:shadow-md animate-fadeIn dark:from-blue-900/30 dark:to-blue-800/20 dark:ring-blue-800/50`}>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 text-xl">💧</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>补水提醒</p>
                <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{waterReminder}</p>
              </div>
            </div>
          </div>
        )}

        {/* 咖啡因状态 */}
        <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-orange-50 to-orange-100 p-3 ring-1 ring-orange-200 transition-all duration-300 hover:shadow-md dark:from-orange-900/30 dark:to-orange-800/20 dark:ring-orange-800/50`}>
          <div className="flex items-start gap-3">
            <div className="transition-transform duration-500 hover:scale-105">
              <CircularProgress
                value={Math.round(caffeineRemaining)}
                max={400}
                size={60}
                strokeWidth={6}
                color={getCaffeineProgressColor}
                backgroundColor={currentTheme.colors.borderColor}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-orange-500">☕️</span>
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>咖啡因状态</p>
              </div>
              <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{caffeineInfo.message}</p>
              {caffeineInfo.advice && (
                <div className={`mt-2 p-3 rounded-lg border ${caffeineInfo.level === 'warning' ? currentTheme.colors.warningBorder : currentTheme.colors.infoBorder} ${caffeineInfo.level === 'warning' ? currentTheme.colors.warning : currentTheme.colors.info} transition-all duration-300 hover:shadow-md animate-slideIn`}>
                  <p className={`text-sm font-medium ${currentTheme.colors.text}`}>{caffeineInfo.advice.message}</p>
                  <p className={`mt-1 text-xs ${currentTheme.colors.textSecondary}`}>{caffeineInfo.advice.action}</p>
                  {caffeineInfo.advice.alternativeDrinks && (
                    <p className={`mt-1 text-xs ${currentTheme.colors.textSecondary}`}>替代饮品: {caffeineInfo.advice.alternativeDrinks.join('、')}</p>
                  )}
                  {caffeineInfo.advice.idealIntake && (
                    <p className={`mt-1 text-xs ${currentTheme.colors.textSecondary}`}>建议摄入量: {caffeineInfo.advice.idealIntake}mg</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 酒精提醒 */}
        {alcoholMessage && (
          <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-amber-50 to-amber-100 p-3 ring-1 ring-amber-200 transition-all duration-300 hover:shadow-md dark:from-amber-900/30 dark:to-amber-800/20 dark:ring-amber-800/50`}>
            <div className="flex items-start gap-3">
              <span className="text-amber-500 text-xl">🍺</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${currentTheme.colors.text}`}>酒精代谢提醒</p>
                <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{alcoholMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 超标提醒 */}
        <div className="space-y-3">
          {(sugarMessage && totalSugar > dailySugarLimit) && (
            <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-pink-50 to-pink-100 p-3 ring-1 ring-pink-200 transition-all duration-300 hover:shadow-md dark:from-pink-900/30 dark:to-pink-800/20 dark:ring-pink-800/50`}>
              <div className="flex items-start gap-3">
                <span className="text-pink-500 text-xl">🍬</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${currentTheme.colors.text}`}>糖分摄入提醒</p>
                  <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{sugarMessage}</p>
                </div>
              </div>
            </div>
          )}
          {(caloriesMessage && totalCalories > dailyCaloriesLimit) && (
            <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-red-50 to-red-100 p-3 ring-1 ring-red-200 transition-all duration-300 hover:shadow-md dark:from-red-900/30 dark:to-red-800/20 dark:ring-red-800/50`}>
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">🔥</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${currentTheme.colors.text}`}>热量摄入提醒</p>
                  <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{caloriesMessage}</p>
                </div>
              </div>
            </div>
          )}
          {(fatMessage && totalFat > dailyFatLimit) && (
            <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-green-50 to-green-100 p-3 ring-1 ring-green-200 transition-all duration-300 hover:shadow-md dark:from-green-900/30 dark:to-green-800/20 dark:ring-green-800/50`}>
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl">🥑</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${currentTheme.colors.text}`}>脂肪摄入提醒</p>
                  <p className={`mt-1 text-sm ${currentTheme.colors.textSecondary}`}>{fatMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 可折叠区域 */}
      <div className="space-y-4">
        {/* 健康建议 */}
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-3 ring-1 ${currentTheme.colors.border} transition-all duration-300`}>
          <button 
            onClick={() => toggleSection('advice')}
            className="flex justify-between items-center w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h4 className={`font-medium ${currentTheme.colors.text}`}>今日摄入建议</h4>
            </div>
            <span className={`${currentTheme.colors.textSecondary} transition-transform duration-300 ${expandedSections.advice ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {expandedSections.advice && (
            <ul className={`mt-3 space-y-1 text-sm ${currentTheme.colors.textSecondary} animate-fadeIn`}>
              {healthAdvice.map((advice, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>{advice}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 健康趋势关联 */}
        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-3 ring-1 ${currentTheme.colors.border} transition-all duration-300`}>
          <button 
            onClick={() => toggleSection('trends')}
            className="flex justify-between items-center w-full text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h4 className={`font-medium ${currentTheme.colors.text}`}>健康趋势关联</h4>
            </div>
            <span className={`${currentTheme.colors.textSecondary} transition-transform duration-300 ${expandedSections.trends ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {expandedSections.trends && (
            <div className="mt-3 animate-fadeIn">
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
          )}
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
  accentColor,
  sleepData
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
      <div className="relative">
        {/* 左侧渐隐效果 */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 dark:from-gray-800"></div>
        {/* 右侧渐隐效果 */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 dark:from-gray-800"></div>
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        <div className="flex">
          <div className="flex-shrink-0 w-full snap-start">
            <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
              <h2 className={`text-base font-semibold ${currentTheme.colors.text} mb-4`}>📋 今日摄入</h2>
              
              {/* 网格布局的指标卡片 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 水分卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-blue-50 to-blue-100 p-3 ring-1 ring-blue-200 transition-all duration-300 hover:shadow-md dark:from-blue-900/30 dark:to-blue-800/20 dark:ring-blue-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>💧 水分</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalWater} ml</p>
                      <p className={`mt-1 text-xs ${exceedWaterTarget ? "text-green-600" : currentTheme.colors.textLight}`}>
                        目标 {dailyWaterTarget} ml
                      </p>
                    </div>
                    <div className="text-2xl">💧</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalWater / dailyWaterTarget) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalWater / dailyWaterTarget) * 100)}%`,
                          backgroundColor: '#3b82f6'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 咖啡因卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-orange-50 to-orange-100 p-3 ring-1 ring-orange-200 transition-all duration-300 hover:shadow-md dark:from-orange-900/30 dark:to-orange-800/20 dark:ring-orange-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>☕️ 咖啡因</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalCaffeine} mg</p>
                      <p className={`mt-1 text-xs ${exceedLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                        上限 {dailyLimit} mg
                      </p>
                    </div>
                    <div className="text-2xl">☕️</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalCaffeine / dailyLimit) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalCaffeine / dailyLimit) * 100)}%`,
                          backgroundColor: '#f97316'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 糖分卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-pink-50 to-pink-100 p-3 ring-1 ring-pink-200 transition-all duration-300 hover:shadow-md dark:from-pink-900/30 dark:to-pink-800/20 dark:ring-pink-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>🍬 糖分</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalSugar} g</p>
                      <p className={`mt-1 text-xs ${exceedSugarLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                        上限 {dailySugarLimit} g
                      </p>
                    </div>
                    <div className="text-2xl">🍬</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalSugar / dailySugarLimit) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalSugar / dailySugarLimit) * 100)}%`,
                          backgroundColor: '#ec489a'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 酒精卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-amber-50 to-amber-100 p-3 ring-1 ring-amber-200 transition-all duration-300 hover:shadow-md dark:from-amber-900/30 dark:to-amber-800/20 dark:ring-amber-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>🍺 酒精</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalAlcohol} mg</p>
                      <p className={`mt-1 text-xs ${exceedAlcoholLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                        上限 {dailyAlcoholLimit} mg
                      </p>
                    </div>
                    <div className="text-2xl">🍺</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalAlcohol / dailyAlcoholLimit) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalAlcohol / dailyAlcoholLimit) * 100)}%`,
                          backgroundColor: '#f59e0b'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 热量卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-red-50 to-red-100 p-3 ring-1 ring-red-200 transition-all duration-300 hover:shadow-md dark:from-red-900/30 dark:to-red-800/20 dark:ring-red-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>🔥 热量</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalCalories} kcal</p>
                      <p className={`mt-1 text-xs ${exceedCaloriesLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                        上限 {dailyCaloriesLimit} kcal
                      </p>
                    </div>
                    <div className="text-2xl">🔥</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalCalories / dailyCaloriesLimit) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalCalories / dailyCaloriesLimit) * 100)}%`,
                          backgroundColor: '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 脂肪卡片 */}
                <div className={`${currentUiStyle.cardRadius} bg-gradient-to-br from-green-50 to-green-100 p-3 ring-1 ring-green-200 transition-all duration-300 hover:shadow-md dark:from-green-900/30 dark:to-green-800/20 dark:ring-green-800/50`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm ${currentTheme.colors.textLight}`}>🥑 脂肪</p>
                      <p className={`mt-1 text-2xl font-bold ${currentTheme.colors.text}`}>{totalFat} g</p>
                      <p className={`mt-1 text-xs ${exceedFatLimit ? "text-rose-600" : currentTheme.colors.textLight}`}>
                        上限 {dailyFatLimit} g
                      </p>
                    </div>
                    <div className="text-2xl">🥑</div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={currentTheme.colors.textSecondary}>进度</span>
                      <span className={currentTheme.colors.textSecondary}>{Math.min(100, Math.floor((totalFat / dailyFatLimit) * 100))}%</span>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: currentTheme.colors.borderColor }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (totalFat / dailyFatLimit) * 100)}%`,
                          backgroundColor: '#10b981'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 今日剩余部分 */}
              <div className={`mt-4 pt-3 border-t ${currentTheme.colors.border}`}>
                <h3 className={`text-sm font-medium ${currentTheme.colors.text} mb-2`}>🎯 今日剩余</h3>
                <div className="grid grid-cols-2 gap-2">
                  <RemainingItem label="水分" value={totalWater} limit={dailyWaterTarget} unit="ml" normalColor={currentTheme.colors.textSecondary} />
                  <RemainingItem label="咖啡因" value={totalCaffeine} limit={dailyLimit} unit="mg" />
                  <RemainingItem label="糖分" value={totalSugar} limit={dailySugarLimit} unit="g" />
                  <RemainingItem label="酒精" value={totalAlcohol} limit={dailyAlcoholLimit} unit="mg" />
                  <RemainingItem label="热量" value={totalCalories} limit={dailyCaloriesLimit} unit="kcal" />
                  <RemainingItem label="脂肪" value={totalFat} limit={dailyFatLimit} unit="g" />
                </div>
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
            sleepData={sleepData}
          />
          </div>
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
              backgroundColor: activeIndex === idx ? accentColor : 'rgba(255, 255, 255, 0.2)'
            }}
          />
        ))}
      </div>
      <div className="fixed bottom-20 right-6 z-20">
        <button
          onClick={() => onAddDrink("咖啡")}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all active:scale-95"
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

// 迷你环形进度条组件
const MiniCircularProgress = ({ value, max, size = 40, strokeWidth = 4, color = '#3b82f6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (value / max) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease-in-out'
          }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{Math.round((progress))}%</div>
      </div>
    </div>
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
  accentColor
}) => {
  const [expanded, setExpanded] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState(['caffeine', 'water']);
  const [trendRange, setTrendRange] = useState('近7天');

  // 计算今日总览数据
  const todayRecords = useMemo(
    () => normalizedRecords.filter((r) => isSameDay(r._date, today)),
    [normalizedRecords, today]
  );

  const todaySummary = useMemo(() => {
    let caffeine = 0;
    let alcohol = 0;
    let water = 0;
    let sugar_g = 0;
    let calories_kcal = 0;
    let fat_g = 0;

    for (const r of todayRecords) {
      caffeine += r.caffeine || 0;
      alcohol += r.alcohol || 0;
      water += r.water || 0;
      sugar_g += r.sugar_g || 0;
      calories_kcal += r.calories_kcal || 0;
      fat_g += r.fat_g || 0;
    }

    return {
      caffeine,
      alcohol,
      water,
      sugar_g,
      calories_kcal,
      fat_g
    };
  }, [todayRecords]);

  // 健康目标值
  const healthGoals = {
    caffeine: 400,
    alcohol: 14000,
    water: 2000,
    sugar_g: 50,
    calories_kcal: 2000,
    fat_g: 70
  };

  // 生成关联分析洞察
  const generateInsights = useMemo(() => {
    if (normalizedRecords.length < 7) return [];

    const insights = [];
    
    // 示例洞察：咖啡因与水分关联
    const coffeeRecords = normalizedRecords.filter(r => r.type === '咖啡' || r.type === '奶茶');
    const waterRecords = normalizedRecords.filter(r => r.type === '水');
    
    if (coffeeRecords.length > 0 && waterRecords.length > 0) {
      const coffeeDays = new Set(coffeeRecords.map(r => dateToKey(r._date)));
      const waterOnCoffeeDays = waterRecords.filter(r => coffeeDays.has(dateToKey(r._date))).length;
      const waterRatio = waterOnCoffeeDays / waterRecords.length;
      
      if (waterRatio > 0.6) {
        insights.push('您在喝咖啡的日子里更注重补水，这是个好习惯！');
      }
    }

    // 示例洞察：周末饮品习惯
    const weekendRecords = normalizedRecords.filter(r => {
      const day = r._date.getDay();
      return day === 0 || day === 6;
    });
    
    if (weekendRecords.length > 0) {
      const weekendCoffee = weekendRecords.filter(r => r.type === '咖啡').length;
      const weekdayCoffee = normalizedRecords.filter(r => {
        const day = r._date.getDay();
        return day !== 0 && day !== 6 && (r.type === '咖啡');
      }).length;
      
      if (weekendCoffee > weekdayCoffee) {
        insights.push('您在周末更倾向于喝咖啡，享受悠闲时光！');
      }
    }

    return insights.length > 0 ? insights : ['继续保持良好的饮品记录习惯！'];
  }, [normalizedRecords]);

  // 准备图表数据
  const chartData = useMemo(() => {
    const filtered = getFilteredRecordsForTrend(normalizedRecords, trendRange, today);
    return getTrendChartData(filtered, trendRange, today, selectedMetrics[0]);
  }, [normalizedRecords, trendRange, today, selectedMetrics]);

  // 指标配置
  const metricsConfig = [
    { key: 'caffeine', name: '咖啡因', unit: 'mg', color: '#9c7a5f' },
    { key: 'water', name: '水分', unit: 'ml', color: '#3b82f6' },
    { key: 'sugar_g', name: '糖分', unit: 'g', color: '#ec489a' },
    { key: 'calories_kcal', name: '热量', unit: 'kcal', color: '#ef4444' },
    { key: 'alcohol', name: '酒精', unit: 'mg', color: '#f59e0b' },
    { key: 'fat_g', name: '脂肪', unit: 'g', color: '#10b981' }
  ];

  // 检查是否有数据
  const hasData = normalizedRecords.length > 0;

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
      const hex = accentColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const lightness = 1 - intensity * 0.5;
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
      const count = isCurrentMonth ? (monthRecords.get(day) || 0) : 0;
      cells.push({ date, day, isCurrentMonth, count });
    }

    return (
      <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mb-4 transition-all duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={prevMonth}
            className={`px-3 py-1 rounded-md ${currentTheme.colors.card} ${currentTheme.colors.textSecondary} hover:${currentTheme.colors.borderLight} transition-colors duration-300`}
          >
            ◀
          </button>
          <h3 className={`text-lg font-semibold ${currentTheme.colors.text}`}>
            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
          </h3>
          <button
            onClick={nextMonth}
            className={`px-3 py-1 rounded-md ${currentTheme.colors.card} ${currentTheme.colors.textSecondary} hover:${currentTheme.colors.borderLight} transition-colors duration-300`}
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
              role="button"
              tabIndex="0"
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm min-h-[44px]
                transition
              `}
              style={{
                backgroundColor: cell.isCurrentMonth && cell.count > 0
                  ? getBgColorStyle(cell.count)
                  : currentTheme.colors.card,
                color: cell.isCurrentMonth ? currentTheme.colors.text : currentTheme.colors.textLight,
                border: `1px solid ${currentTheme.colors.borderColor}`,
                boxShadow: 'hover: 0 2px 4px rgba(0,0,0,0.1)'
              }}
              title={cell.isCurrentMonth ? `${cell.day}日：${cell.count}杯` : ''}
              aria-label={cell.isCurrentMonth ? `${cell.day}日，记录了${cell.count}杯饮品` : `${cell.day}日`}
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

  return (
    <section className="space-y-4">
      {hasData ? (
        <>
          <CalendarHeatmap accentColor={accentColor} />
          
          {/* 今日总览卡片 */}
          <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>📋 今日总览</h2>
              <button
                onClick={() => setExpanded(!expanded)}
                className={`text-sm ${currentTheme.colors.textSecondary} hover:${currentTheme.colors.text}`}
              >
                {expanded ? '收起' : '展开'}
              </button>
            </div>
            {expanded && (
              <div className="grid grid-cols-3 gap-4">
                {metricsConfig.map((metric) => {
                  const value = todaySummary[metric.key];
                  const goal = healthGoals[metric.key];
                  const isExceeded = value > goal;
                  
                  return (
                    <div key={metric.key} className="flex flex-col items-center">
                      <MiniCircularProgress
                        value={value}
                        max={goal}
                        color={isExceeded ? '#ef4444' : metric.color}
                      />
                      <p className={`mt-2 text-xs ${currentTheme.colors.textSecondary}`}>{metric.name}</p>
                      <p className={`text-sm font-medium ${isExceeded ? 'text-rose-500' : currentTheme.colors.text}`}>
                        {value} {metric.unit}
                      </p>
                      <p className={`text-xs ${currentTheme.colors.textLight}`}>目标: {goal} {metric.unit}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 核心趋势图 */}
          <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} transition-all duration-300`}>
            <div className="mb-4">
              <h2 className={`text-base font-semibold ${currentTheme.colors.text} mb-3`}>📊 核心趋势</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {metricsConfig.map((metric) => (
                  <button
                    key={metric.key}
                    className={`px-3 py-1 rounded-full text-xs transition-colors duration-300 ${selectedMetrics[0] === metric.key ? currentTheme.colors.border : ''}`}
                    style={{
                      backgroundColor: selectedMetrics[0] === metric.key ? metric.color : currentTheme.colors.cardColor,
                      color: selectedMetrics[0] === metric.key ? getContrastColor(metric.color) : currentTheme.colors.textSecondaryColor,
                      borderColor: selectedMetrics[0] === metric.key ? metric.color : currentTheme.colors.borderColor
                    }}
                    onClick={() => {
                      setSelectedMetrics([metric.key]);
                    }}
                  >
                    {metric.name}
                  </button>
                ))}
              </div>
              <div className={`flex overflow-x-auto rounded-lg ${currentTheme.colors.borderLight} p-1`}>
                <div className="flex gap-1">
                  {TREND_RANGES.map((range) => (
                    <button
                      key={range}
                      className={`rounded-md px-2 py-1 text-xs whitespace-nowrap flex-shrink-0 transition-colors duration-300 ${
                        trendRange === range ? `${currentTheme.colors.card} ${currentTheme.colors.text} shadow-sm` : currentTheme.colors.textLight
                      }`}
                      onClick={() => setTrendRange(range)}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" key={currentTheme.name}>
                <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 5 }}>
                  {selectedMetrics[0] && (
                    <>
                      <defs>
                        <linearGradient id={`gradient-${selectedMetrics[0]}-${currentTheme.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metricsConfig.find(m => m.key === selectedMetrics[0]).color} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={metricsConfig.find(m => m.key === selectedMetrics[0]).color} stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke={metricsConfig.find(m => m.key === selectedMetrics[0]).color}
                        fillOpacity={1}
                        fill={`url(#gradient-${selectedMetrics[0]}-${currentTheme.name})`}
                        name={metricsConfig.find(m => m.key === selectedMetrics[0]).name}
                      />
                    </>
                  )}
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
                </AreaChart>
              </ResponsiveContainer>
            </div>
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
  getContrastColor,
  sleepData,
  setSleepData
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
              className={`rounded-md border ${currentTheme.colors.border} px-2 py-1 text-xs ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:${currentTheme.colors.borderLight}`}
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
                className={`h-12 w-12 rounded-full border ${currentTheme.colors.border} object-cover`}
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
          <div className="mt-2 flex flex-wrap gap-2 text-xs ${currentTheme.colors.textLight}">
            {Number(profile.age) > 0 ? <span className={currentTheme.colors.textLight}>年龄：{profile.age}</span> : null}
            {Number(profile.weight) > 0 ? <span className={currentTheme.colors.textLight}>体重：{profile.weight} kg</span> : null}
            {Number(profile.bloodSugar) > 0 ? <span className={currentTheme.colors.textLight}>血糖：{profile.bloodSugar} mmol/L</span> : null}
            {profile.gender && profile.gender !== "未设置" ? <span className={currentTheme.colors.textLight}>性别：{profile.gender}</span> : null}
          </div>

          {isEditingProfile && (
            <div className={`mt-4 space-y-3 rounded-xl ${currentTheme.colors.card} p-3`}>
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

        <div className={`${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 ${currentUiStyle.shadow} ring-1 ${currentTheme.colors.cardBorder} mt-4 transition-all duration-300`}>
          <h2 className={`text-base font-semibold ${currentTheme.colors.text}`}>😴 睡眠设置</h2>
          <p className={`mt-2 text-xs ${currentTheme.colors.textLight}`}>设置您的睡眠习惯，获取更精准的咖啡因摄入建议。</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>通常入睡时间</label>
              <input
                type="time"
                value={sleepData.usualBedtime}
                onChange={(e) => setSleepData(prev => ({ ...prev, usualBedtime: e.target.value }))}
                className={`w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </div>
            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>通常起床时间</label>
              <input
                type="time"
                value={sleepData.usualWakeup}
                onChange={(e) => setSleepData(prev => ({ ...prev, usualWakeup: e.target.value }))}
                className={`w-full rounded-xl border ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 text-sm ${currentTheme.colors.text} outline-none ring-indigo-200 focus:ring`}
              />
            </div>
            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>睡眠质量</label>
              <div className="grid grid-cols-3 gap-2">
                {["poor", "fair", "good"].map(quality => (
                  <button
                    key={quality}
                    onClick={() => setSleepData(prev => ({ ...prev, sleepQuality: quality }))}
                    className={`py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                    style={{
                      backgroundColor: sleepData.sleepQuality === quality ? accentColor : currentTheme.colors.cardColor,
                      color: sleepData.sleepQuality === quality ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                      borderColor: sleepData.sleepQuality === quality ? accentColor : currentTheme.colors.borderColor
                    }}
                  >
                    {quality === "poor" ? "较差" : quality === "fair" ? "一般" : "良好"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-sm ${currentTheme.colors.textSecondary} mb-2`}>咖啡因敏感度</label>
              <div className="grid grid-cols-3 gap-2">
                {["low", "medium", "high"].map(sensitivity => (
                  <button
                    key={sensitivity}
                    onClick={() => setSleepData(prev => ({ ...prev, sensitivityToCaffeine: sensitivity }))}
                    className={`py-2 rounded-xl border text-sm transition-colors duration-300 ${currentTheme.colors.border}`}
                    style={{
                      backgroundColor: sleepData.sensitivityToCaffeine === sensitivity ? accentColor : currentTheme.colors.cardColor,
                      color: sleepData.sensitivityToCaffeine === sensitivity ? getContrastColor(accentColor) : currentTheme.colors.textSecondaryColor,
                      borderColor: sleepData.sensitivityToCaffeine === sensitivity ? accentColor : currentTheme.colors.borderColor
                    }}
                  >
                    {sensitivity === "low" ? "低" : sensitivity === "medium" ? "中" : "高"}
                  </button>
                ))}
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
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
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
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const displayedRecords = sortedRecords.slice(0, endIndex);
  const hasMore = endIndex < sortedRecords.length;

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
              <li key={r.id} className={`${currentUiStyle.cardRadius} ${currentTheme.colors.border} ${currentTheme.colors.card} px-3 py-2 transition hover:${currentTheme.colors.borderLight}`}>
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
          {hasMore && (
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              className={`mt-3 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} py-2 text-sm ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:${currentTheme.colors.borderLight}`}
            >
              加载更多 ({sortedRecords.length - endIndex} 条)
            </button>
          )}
          {currentPage > 1 && (
            <button
              onClick={() => setCurrentPage(1)}
              className={`mt-2 w-full rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.card} py-2 text-sm ${currentTheme.colors.textSecondary} transition-colors duration-300 hover:${currentTheme.colors.borderLight}`}
            >
              收起 (显示最近 ${PAGE_SIZE} 条)
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
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // 检测设备类型
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  // 键盘事件处理和滚动穿透修复
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 恢复背景滚动
      document.body.style.overflow = '';
    };
  }, [open, onClose, onConfirm]);

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

  // 拖动关闭功能
  const handleMouseDown = (e) => {
    setStartY(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setCurrentY(e.clientY - startY);
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    if (currentY > 100) {
      onClose();
    }
    setIsDragging(false);
    setCurrentY(0);
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY - startY);
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    if (currentY > 100) {
      onClose();
    }
    setIsDragging(false);
    setCurrentY(0);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/45" onClick={onClose}>
      <div 
        className={`w-full ${currentUiStyle.cardRadius} ${currentTheme.colors.card} p-4 shadow-2xl space-y-8 transition-colors duration-300 max-h-[80vh] overflow-y-auto`} 
        onClick={(e) => e.stopPropagation()}
        style={{ transform: currentY > 0 ? `translateY(${currentY}px)` : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <h3 className={`text-base font-semibold ${currentTheme.colors.text}`}>选择饮品参数</h3>

        <div>
          <p className={`mb-2 text-sm ${currentTheme.colors.textSecondary}`}>饮品类型</p>
          <div className="flex gap-2 flex-wrap">
            {DRINK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => onTypeChange(t)}
                className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                    className={`flex-1 py-2 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                  className={`py-2 px-3 ${currentUiStyle.buttonRadius} border text-sm transition ${currentTheme.colors.border} hover:${currentTheme.colors.borderLight} focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
          <button onClick={onClose} className={`flex-1 py-2 ${currentUiStyle.buttonRadius} ${currentTheme.colors.border} ${currentTheme.colors.card} ${currentTheme.colors.textLight} active:scale-95 transition hover:${currentTheme.colors.borderLight}`}>
            取消
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-2 ${currentUiStyle.buttonRadius} active:scale-95 transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2`}
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

// 启动屏幕组件
const SplashScreen = ({ onAnimationComplete }) => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // 先显示1秒，然后开始动画
    const timer1 = setTimeout(() => {
      setAnimate(true);
    }, 1000);

    // 动画结束后调用回调
    const timer2 = setTimeout(() => {
      onAnimationComplete();
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onAnimationComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900 transition-all duration-1000 ease-in-out ${animate ? 'translate-y-[-100%]' : ''}`}
      style={{
        transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div 
        className={`relative transition-all duration-1000 ease-in-out ${animate ? 'scale-50' : ''}`}
        style={{
          transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1), color 1s ease-in-out'
        }}
      >
        <h1 
          style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold' }} 
          className={`text-4xl ${animate ? 'text-white' : 'text-[#b08968]'}`}
        >
          MyDrink
        </h1>
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
  const [isLoading, setIsLoading] = useState(true);
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

  // 睡眠数据
  const [sleepData, setSleepData] = useState(() => {
    try {
      const saved = localStorage.getItem(SLEEP_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      usualBedtime: "23:00",
      usualWakeup: "07:00",
      sleepQuality: "fair",
      sensitivityToCaffeine: "medium"
    };
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
        sugar_g: r.sugar_g ?? r.sugar ?? 0,
        calories_kcal: r.calories_kcal ?? r.calories ?? 0,
        fat_g: r.fat_g ?? r.fat ?? 0
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

  useEffect(() => {
    localStorage.setItem(SLEEP_KEY, JSON.stringify(sleepData));
  }, [sleepData]);
  
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

  const handleSplashAnimationComplete = () => {
    setIsLoading(false);
  };

  return (
    <div className={`mx-auto flex min-h-screen w-full max-w-md flex-col transition-colors duration-300 ${currentTheme.colors.background} ${theme === 'dark' ? 'dark' : ''}`}>
      {isLoading && <SplashScreen onAnimationComplete={handleSplashAnimationComplete} />}
      <header className={`sticky top-0 z-10 backdrop-blur transition-colors duration-300 ${currentTheme.colors.border} ${currentTheme.colors.card} py-4 rounded-b-3xl`}>
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
            sleepData={sleepData}
          />
        )}

        {activeTab === "数据趋势" && (
          <TrendTab
            normalizedRecords={normalizedRecords}
            today={today}
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
            sleepData={sleepData}
            setSleepData={setSleepData}
          />
        )}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 mx-auto flex w-full max-w-md backdrop-blur transition-colors duration-300 ${currentTheme.colors.border} ${currentTheme.colors.card} ${currentUiStyle.cardRadius.replace('rounded-', 'rounded-t-')}`}>
        {TABS.map((tab) => (
          <button
              key={tab}
              className={`flex-1 py-3 text-xs font-medium transition-colors duration-300 min-h-[44px] ${
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