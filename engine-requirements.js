if (+process.versions.node.split(".")[0] < 20) {
  console.error(`Node.js v20+ required. Your Use v(${process.versions.node})`)
  process.exit(1)
}
