import { path as AppRoot } from "app-root-path"
import { open, writeFile } from "fs/promises"
import { exec } from "child_process"
import { join } from "path"

const PREFIX_FILE = join(AppRoot, "src/prefix.js")
const BUILT_FILE = join(AppRoot, "build/dist/index.js")
const OUT_FILE = join(AppRoot, "build/dist/generate_forever.user.js")
const DEFAULT_VERSION = "0.2.1"
const DEFAULT_REVISION = ""

// https://marcinbiernat.pl/2020/03/nodejs-globals/
const main = async () => {
  console.log("PREFIX_FILE", PREFIX_FILE)
  console.log("BUILT_FILE", BUILT_FILE)
  console.log("OUT_FILE", OUT_FILE)

  const ver = (await new Promise<string>((resolve, reject) => {
    exec("git describe --tags --abbrev=0", (err, stdout, stderr) => {
      if (err) {
        reject({ err, stderr })
      } else {
        resolve(stdout.trim())
      }
    })
  }).catch((e) => {
    console.error("error", e)
    return DEFAULT_VERSION
  }).then((v) => v.replace(/^v/, "")))

  const rev = await new Promise<string>((resolve, reject) => {
    exec("git rev-parse --short HEAD", (err, stdout, stderr) => {
      if (err) {
        reject({ err, stderr })
      } else {
        resolve(stdout.trim())
      }
    })
  }).catch((e) => {
    console.error("error", e)
    return DEFAULT_REVISION
  })

  const prefix = await open(PREFIX_FILE, "r")
  const built = await open(BUILT_FILE, "r")
  const prefixContent = await prefix.readFile("utf-8")
  const builtContent = await built.readFile("utf-8")
  const versionString = rev == DEFAULT_REVISION ? ver : `${ver}-${rev}`
  const prefixWithRevision = prefixContent.replace(
    /@REVISION@/g,
    versionString
  )
  console.log("VERSION", versionString)
  const concated = prefixWithRevision + builtContent
  const out = await open(OUT_FILE, "w")
  await out.writeFile(concated)
  await out.close()
}

main()
