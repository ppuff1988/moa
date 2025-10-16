/_ 古董局主題配色 - 基於中式古董美學 _/
--background: 25 10% 11%; /_ 墨黑背景 #1C1B19 _/
--foreground: 42 15% 96%; /_ 米白文字 #F5F1E8 _/

    --card: 38 25% 83%; /* 宣紙米色 #E8D9C5 */
    --card-foreground: 30 15% 20%; /* 深色文字在淺色卡片上 */

    --popover: 38 25% 83%;
    --popover-foreground: 30 15% 20%;

    --primary: 1 63% 39%; /* 朱紅色 #A52422 */
    --primary-foreground: 42 15% 96%;

    --secondary: 42 30% 59%; /* 鎏金色 #C6A664 */
    --secondary-foreground: 30 15% 20%;

    --muted: 38 25% 83%; /* 宣紙色 */
    --muted-foreground: 30 15% 50%; /* 灰褐色 #7A6E5E */

    --accent: 150 15% 36%; /* 青銅/黛綠 #4B6F5B */
    --accent-foreground: 42 15% 96%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 42 15% 96%;

    --border: 30 20% 25%; /* 深色邊框 */
    --input: 30 20% 25%;
    --ring: 1 63% 39%; /* 朱紅色焦點環 */

    --radius: 0.75rem;

    /* 古董風格漸變 */
    --gradient-antique: linear-gradient(135deg, hsl(var(--card)), hsl(var(--card)) 50%, hsl(42 20% 78%));
    --gradient-gold: linear-gradient(135deg, hsl(var(--secondary)), hsl(42 40% 65%));
    --gradient-shadow: 0 10px 30px -5px hsl(var(--primary) / 0.3);

    /* 古董紋理陰影 */
    --shadow-antique: 0 8px 25px -5px hsl(30 20% 15% / 0.4), inset 0 1px 0 hsl(42 30% 90% / 0.3);
    --transition-elegant: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);

}

/_ 移除暗色主題，使用統一的古董風格 _/
