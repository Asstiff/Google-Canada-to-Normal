/**
 * @author Helge_0x00
 *
 * [Panel]
 * disney_check = script-name=disney_check,title=Disney+ 解锁检测,style=alert,content=请刷新面板,update-interval=1800
 *
 * [Script]
 * disney_check = type=generic,script-path=https://gist.githubusercontent.com/Hyseen/729fc4c3ac28c3f2e7c4a832d81780f3/raw/disney_check.js
 *
 * 支持使用脚本使用 argument 参数自定义配置，如：argument=key1=URLEncode(value1)&key2=URLEncode(value2)，具体参数如下所示，
 * title: 面板标题
 * availableContent: 解锁时展示的的文本内容，支持以下四个个区域占位符 #REGION_FLAG#、#REGION_CODE#、#REGION_NAME#、#REGION_NAME_EN#，用来展示地区国旗 emoji 、地区编码、地区中文名称、地区英文名称
 * availableIcon: 解锁时展示的图标，内容为任意有效的 SF Symbol Name
 * availableIconColor:  解锁时展示的图标颜色，内容为颜色的 HEX 编码
 * availableStyle: 解锁时展示的图标样式，参数可选值有 good, info, alert, error
 * comingContent: 计划上线展示的的文本内容，支持以下四个个区域占位符 #REGION_FLAG#、#REGION_CODE#、#REGION_NAME#、#REGION_NAME_EN#，用来展示地区国旗 emoji 、地区编码、地区中文名称、地区英文名称
 * comingIcon: 计划上线展示的图标，内容为任意有效的 SF Symbol Name
 * comingIconColor:  计划上线展示的图标颜色，内容为颜色的 HEX 编码
 * comingStyle: 计划上线展示的图标样式，参数可选值有 good, info, alert, error
 * notAvailableContent: 不支持解锁时展示的文本内容
 * notAvailableIcon: 不支持解锁时展示的图标
 * notAvailableIconColor: 不支持解锁时展示的图标颜色
 * notAvailableStyle: 不支持解锁时展示的图标样式
 * errorContent: 检测异常时展示的文本内容
 * errorIcon: 检测异常时展示的图标
 * errorIconColor: 检测异常时展示的图标颜色
 * errorStyle: 检测异常时展示的图标样式
 * timeout: 超时时间，毫秒，默认为 3000
 */

const BASE_URL = "https://www.paramountplus.com/";
 // 支持解锁
 const STATUS_AVAILABLE = 1
 // 不支持解锁
 const STATUS_NOT_AVAILABLE = 0
 // 检测超时
 const STATUS_TIMEOUT = -1
 // 检测异常
 const STATUS_ERROR = -2
 
 const DEFAULT_OPTIONS = {
   title: 'Paramount+ 解锁检测',
   availableContent: '支持 Paramount+',
   availableIcon: undefined,
   availableIconColor: undefined,
   availableStyle: 'good',
   notAvailableContent: '不支持 Paramount+',
   notAvailableIcon: undefined,
   notAvailableIconColor: undefined,
   notAvailableStyle: 'alert',
   errorContent: '检测失败，请稍后重试',
   errorIcon: undefined,
   errorIconColor: undefined,
   errorStyle: 'error',
   timeout: 3000,
 }
 
 let options = getOptions()
 let panel = {
   title: options.title,
 }
 
;(async () => {
    let {statuss } = await testParam();
 
 switch (statuss) {
     case STATUS_AVAILABLE:
       if (options.availableIcon) {
         panel['icon'] = options.availableIcon
         panel['icon-color'] = options.availableIconColor ?? undefined
       } else {
         panel['style'] = options.availableStyle
       }
       panel['content'] = replaceRegionPlaceholder(options.availableContent, region)
       return
     case STATUS_NOT_AVAILABLE:
       if (options.notAvailableIcon) {
         panel['icon'] = options.notAvailableIcon
         panel['icon-color'] = options.notAvailableIconColor ?? undefined
       } else {
         panel['style'] = options.notAvailableStyle
       }
       panel['content'] = options.notAvailableContent
       return
     default:
       if (options.errorIcon) {
         panel['icon'] = options.errorIcon
         panel['icon-color'] = options.errorIconColor ? options.errorIconColor : undefined
       } else {
         panel['style'] = options.errorStyle
       }
       panel['content'] = options.errorContent
   }
    })().finally(() => {
  $done(panel)
})

 function testParam() { 
    let opt = {
      url: BASE_URL,
      opts: opts1,
      timeout: 2800,
      headers: {
        'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
      },
    }
    $task.fetch(opt).then(response=> {
      if (response.statusCode == 200) {
        //reject('Error')
        return 1;
      } else if (response.statusCode == 302) {
        //resolve('Not Available')
        return 0;
      } 
    })
  };

 
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
 