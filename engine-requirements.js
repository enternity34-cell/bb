if (+process.versions.node.split('.')[0] < 20) {
  console.error(`Node.js required. Your Use (${process.versions.node})`)
  process.exit(1)
}