import { path as AppRoot } from "app-root-path"
import { open, writeFile } from "fs/promises"
import { exec } from "child_process"
import { join } from "path"

const PREFIX_FILE = join(AppRoot, "src/prefix.js")
const BUILT_FILE = join(AppRoot, "build/dist/index.js")
const OUT_FILE = join(AppRoot, "build/dist/generate_forever.user.js")

// https://marcinbiernat.pl/2020/03/nodejs-globals/
const main = async () => {
  console.log("PREFIX_FILE", PREFIX_FILE)
  console.log("BUILT_FILE", BUILT_FILE)
  console.log("OUT_FILE", OUT_FILE)
  const revision = new Promise<string>((resolve, reject) => {
    exec("git rev-parse --short HEAD", (err, stdout, stderr) => {
      if (err) {
        reject({ err, stderr })
      } else {
        resolve(stdout.trim())
      }
    })
  })
  const prefix = await open(PREFIX_FILE, "r")
  const built = await open(BUILT_FILE, "r")
  const prefixContent = await prefix.readFile("utf-8")
  const builtContent = await built.readFile("utf-8")
  const rev = await revision
  const prefixWithRevision = prefixContent.replace(
    /@REVISION@/g,
    rev.toString()
  )
  console.log("REVISION", rev)
  const concated = prefixWithRevision + builtContent
  const out = await open(OUT_FILE, "w")
  await out.writeFile(concated)
  await out.close()
}

main()
