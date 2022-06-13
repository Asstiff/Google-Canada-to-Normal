/**
 *
 * 
 * 基于 Hyseen 的 Netflix 检测
 * 
 * 以下为原作者的注释
 * 
 * [Panel]
 * para_check = script-name=para_check, title="Paramount+ 解锁检测", content="请刷新", update-interval=1
 * [Script]
 * para_check = type=generic, script-path=https://raw.githubusercontent.com/Asstiff/Google-Canada-to-Normal/main/ParamountPlus.js, argument=title=Paramount+ 解锁检测
 *
 * 支持使用脚本使用 argument 参数自定义配置，如：argument=key1=URLEncode(value1)&key2=URLEncode(value2)，具体参数如下所示，
 * title: 面板标题
 * fullContent: 完整解锁时展示的的文本内容，支持以下四个个区域占位符 #REGION_FLAG#、#REGION_CODE#、#REGION_NAME#、#REGION_NAME_EN#，用来展示地区国旗 emoji 、地区编码、地区中文名称、地区英文名称
 * fullIcon: 完整解锁时展示的图标，内容为任意有效的 SF Symbol Name
 * fullIconColor：完整解锁时展示的图标颜色，内容为颜色的 HEX 编码
 * fullStyle: 完整解锁时展示的图标样式，参数可选值有 good, info, alert, error
 * onlyOriginalContent：仅解锁自制剧时展示的文本内容，支持以下四个个区域占位符 #REGION_FLAG#、#REGION_CODE#、#REGION_NAME#、#REGION_NAME_EN#，用来展示地区国旗 emoji 、地区编码、地区中文名称、地区英文名称
 * onlyOriginalIcon: 仅解锁自制剧时展示的图标
 * onlyOriginalIconColor: 仅解锁自制剧时展示的图标颜色
 * onlyOriginalStyle: 仅解锁自制剧时展示的图标样式
 * notAvailableContent: 不支持解锁时展示的文本内容
 * notAvailableIcon: 不支持解锁时展示的图标
 * notAvailableIconColor: 不支持解锁时展示的图标颜色
 * notAvailableStyle: 不支持解锁时展示的图标样式
 * errorContent: 检测异常时展示的文本内容
 * errorIcon: 检测异常时展示的图标
 * errorIconColor: 检测异常时展示的图标颜色
 * errorStyle: 检测异常时展示的图标样式
 */

 const BASE_URL = 'https://www.paramountplus.com/'
 const DEFAULT_OPTIONS = {
   title: 'Paramount+ 解锁检测',
   fullContent: '支持 Paramount+',
   fullIcon: '',
   fullIconColor: '',
   fullStyle: 'good',
   notAvailableContent: '不支持 Paramount+',
   notAvailableIcon: '',
   notAvailableIconColor: '',
   notAvailableStyle: 'alert',
   errorContent: '检测失败，请重试',
   errorIcon: '',
   errorIconColor: '',
   errorStyle: 'error',
 }
 
 let options = getOptions()
 let panel = {
   title: options.title,
 }
 
 ;(async () => {
   await Promise.race([test(), timeout(10000)])
     .then(async region => {
       if (options.fullIcon) {
         panel['icon'] = options.fullIcon
         panel['icon-color'] = options.fullIconColor ? options.fullIconColor : undefined
       } else {
         panel['style'] = options.fullStyle
       }
       let content = options.fullContent
 
     })

     .catch(error => {
       if (error !== 'Not Available') {
         return Promise.reject(error)
       }
 
       panel['content'] = options.notAvailableContent
       if (options.notAvailableIcon) {
         panel['icon'] = options.notAvailableIcon
         panel['icon-color'] = options.notAvailableIconColor ? options.notAvailableIconColor : undefined
       } else {
         panel['style'] = options.notAvailableStyle
       }
     })
 })()
   .catch(error => {
     console.log(error)
     if (options.errorIcon) {
       panel['icon'] = options.errorIcon
       panel['icon-color'] = options.errorIconColor ? options.errorIconColor : undefined
     } else {
       panel['style'] = options.errorStyle
     }
     panel['content'] = options.errorContent
   })
   .finally(() => {
     $done(panel)
   })
 
 function test() {
   return new Promise((resolve, reject) => {
     let option = {
       url: BASE_URL,
       headers: {
         'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
       },
     }
     $httpClient.get(option, function (error, response, data) {
       if (error != null) {
         reject(error)
         return
       }
 
       if (response.status === 302) {
         reject('Not Available')
         return
       }
 
       if (response.status === 200) {
         return
       }
 
       reject('Error')
     })
   })
 }
 
 function timeout(delay = 5000) {
   return new Promise((resolve, reject) => {
     setTimeout(() => {
       reject('Timeout')
     }, delay)
   })
 }
 
 function getOptions() {
   let options = Object.assign({}, DEFAULT_OPTIONS)
   if (typeof $argument != 'undefined') {
     try {
       let params = Object.fromEntries(
         $argument
           .split('&')
           .map(item => item.split('='))
           .map(([k, v]) => [k, decodeURIComponent(v)])
       )
       Object.assign(options, params)
     } catch (error) {
       console.error(`$argument 解析失败，$argument: + ${argument}`)
     }
   }
 
   return options
 }
 
 