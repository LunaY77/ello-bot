/**
 * PostCSS 配置文件
 * PostCSS 是 CSS 后处理器，用于转换 CSS
 */
export default {
  plugins: {
    /**
     * Tailwind CSS 插件
     * 处理 @tailwind 指令，生成工具类
     */
    tailwindcss: {},

    /**
     * Autoprefixer 插件
     * 自动添加浏览器前缀，确保 CSS 兼容性
     */
    autoprefixer: {},
  },
};
