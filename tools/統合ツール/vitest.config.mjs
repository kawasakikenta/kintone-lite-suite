// vitest は既定で CSS の import を空の文字列にする。ER図ビューアーの CSS（src/tabs/er-viewer/viewer.css）は
// `?raw` で文字列として HTML へ埋め込むため、単体テストでも中身を読めるようにする（ビルドは rawTextPlugin.js が同じことをする）。
export default {
  test: {
    css: { include: [/src[\\/]tabs[\\/]er-viewer[\\/]viewer\.css/] }
  }
};
