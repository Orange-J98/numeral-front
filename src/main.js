import Vue from 'vue'
import './plugins/axios'
import App from './App.vue'
import router from './router'
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import moment from 'moment'
import VueClipboard from 'vue-clipboard2';


Vue.filter('moment', function(value, formatString) {
    formatString = formatString || 'YYYY-MM-DD HH:mm:ss';
    // return moment(value).format(formatString); // value可以是普通日期 20170723
    return moment.unix(value / 1000).format(formatString); // 这是时间戳转时间
});

Vue.config.productionTip = false
Vue.use(ElementUI).use(VueClipboard);

Vue.prototype.global = {
    me: null
}

// 设置浏览器标题
Vue.directive('title', {
    inserted: function(el, binding) {
        document.title = el.dataset.title;
        console.log(binding);
    }
})

Vue.mixin({
    methods: {
        success(message) {
            this.$message({
                message: message,
                type: "success",
            });
        },
        err(errObj) {
            this.$message({
                message: errObj.response.data.message,
                type: "error",
            });
        },
        errmsg(msg) {
            this.$message({
                message: msg,
                type: "error",
            });
        },
        jmp(path) {
            this.$router.push({ path: path })
        },
        refreshMe() {
            this.axios.get("/api/access/me").then((res) => {
                this.meReturned = true;
                this.global.me = res.data;
            });
            this.$router.go(0);
        },
        moment(t) {
            var formatString = 'YYYY-MM-DD HH:mm:ss';
            return moment.unix(t / 1000).format(formatString); // 这是时间戳转时间
        }
    }
})

new Vue({
    router,
    render: h => h(App)
}).$mount('#app')


//枚举类Access
class Access {
    constructor(name) {
        this.name = name;
    }

    getName() {
        return this.name;
    }
}

Access.None = new Access('none');
Access.Read = new Access('read');
Access.ReadWrite = new Access('readWrite');

Object.freeze(Access); // 冻结对象，防止修改

router.beforeEach((to, from, next) => {
    /* 路由发生变化修改页面title */
    if (to.meta.title) {
        document.title = to.meta.title
    }
    next()
})
export { Access }