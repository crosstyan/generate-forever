# generate-forever

a userscript to generate forever for a novel site

```bash
pnpm install
pnpm run build
```

```
> generate_forever@1.0.0 build C:\Users\cross\Desktop\code\generate-forever
> npm-run-all build:tsc build:esbuild concat


> generate_forever@1.0.0 build:tsc C:\Users\cross\Desktop\code\generate-forever
> tsc -p .


> generate_forever@1.0.0 build:esbuild C:\Users\cross\Desktop\code\generate-forever
> esbuild ./build/src/index.js --bundle --minify --outdir=./build/dist


  build\dist\index.js  180.4kb

Done in 133ms

> generate_forever@1.0.0 concat C:\Users\cross\Desktop\code\generate-forever
> node build/scripts/concat.js

PREFIX_FILE C:\Users\cross\Desktop\code\generate-forever\src\prefix.js
BUILT_FILE C:\Users\cross\Desktop\code\generate-forever\build\dist\index.js
OUT_FILE C:\Users\cross\Desktop\code\generate-forever\build\dist\generate_forever.user.js
```

install `generate_forever.user.js` to Tampermonkey/Greasemonkey

## See also

- [Why does `@require` always give me the error "couldn't load @require from forbidden URL" for local scripts on Greasemonkey/Tampermonkey](https://stackoverflow.com/questions/68205265/why-does-require-always-give-me-the-error-couldnt-load-require-from-forbidde)
