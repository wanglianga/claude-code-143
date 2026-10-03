export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'gig-platform-dev-secret-2026',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? 'root',
    database: process.env.DB_NAME || 'gig_platform',
  },
  // 演示用：签到点允许的定位半径（米）
  geofenceRadiusMeters: 300,
  // 保险在“实际到岗 + 主管确认”后多少秒内生效（演示用，即时生效）
  insuranceActivateDelaySec: 0,
};
