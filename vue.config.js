// vue.config.js (create if missing)
module.exports = {
  configureWebpack: { entry: './src/main.ts' },
  devServer: {
    // The donation assistant's API runs separately in dev: `npm run dev:assistant`
    proxy: { '/api': { target: 'http://localhost:3001' } }
  }
}
