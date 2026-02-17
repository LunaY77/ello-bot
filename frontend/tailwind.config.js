/** @type {import('tailwindcss').Config} */

/**
 * Tailwind CSS 配置文件
 *
 * Tailwind CSS 是实用工具优先的 CSS 框架
 * 提供预定义的样式类，通过组合类名快速构建 UI
 */
export default {
  /**
   * 内容扫描路径
   * Tailwind 会扫描这些文件，找出使用的类名，生成优化的 CSS
   */
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  /**
   * 主题配置
   */
  theme: {
    /**
     * 容器配置
     * container 类：响应式居中容器
     */
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },

    /**
     * 扩展默认主题
     */
    extend: {
      /**
       * 颜色系统
       * 使用 CSS 变量（HSL 格式）实现主题切换
       */
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        /**
         * 语义化颜色
         * primary：主要操作按钮、链接等
         * secondary：次要操作
         * destructive：危险操作（删除、警告）
         * muted：禁用状态
         * accent：强调元素
         */
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },

      /**
       * 圆角
       * 使用 CSS 变量 --radius 统一管理圆角大小
       */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /**
       * 关键帧动画
       */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },

      /**
       * 动画配置
       */
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },

  /**
   * 插件
   */
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
