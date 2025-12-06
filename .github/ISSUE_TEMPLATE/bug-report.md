---
name: Bug report
about: 發現 bug 立即回報
title: ''
labels: ''
assignees: ''

---

name: 🐞 Bug 回報
description: 用來回報一個錯誤或異常行為
title: "[BUG] "
labels: ["bug"]
body:
  - type: textarea
    id: describe
    attributes:
      label: 🐞 問題描述（Describe the bug）
      description: 清楚簡潔地描述發生了什麼問題。
      placeholder: 請輸入問題描述…
    validations:
      required: true

  - type: textarea
    id: reproduce
    attributes:
      label: 🔄 重現步驟（To Reproduce）
      description: 請提供可以重現問題的步驟。
      placeholder: |
        1. 前往「…」
        2. 點擊「…」
        3. 滑動到「…」
        4. 出現錯誤
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: ✅ 預期行為（Expected behavior）
      description: 清楚描述你本來預期應該發生的情況。
    validations:
      required: true

  - type: textarea
    id: screenshots
    attributes:
      label: 🖼️ 螢幕截圖（Screenshots）
      description: 若有需要，請附上截圖以協助說明問題。
      placeholder: 可拖曳圖片至此上傳…

  - type: input
    id: desktop
    attributes:
      label: 💻 桌機環境（Desktop）
      description: 請描述使用環境，例如 macOS / Chrome 22。
      placeholder: OS / Browser / Version

  - type: input
    id: mobile
    attributes:
      label: 📱 行動裝置環境（Smartphone）
      description: 若為手機問題，請描述裝置資訊。
      placeholder: Device / OS / Browser / Version

  - type: textarea
    id: additional
    attributes:
      label: 📌 補充資訊（Additional context）
      description: 任何與問題相關的額外資訊都可補充在此。
