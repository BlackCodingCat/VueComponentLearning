## 1. 组件的三个核心API
* prop  
    prop定义了组件有哪些可配置的属性，确定组件的核心功能
* event
* slot

### prop
```javascript
// props最好用对象形式，可以设置值类型，自定义哦校验，默认值
function oneOf(value, validList) {
    for(let i=0; i<validList.length; i++) {
        if(value === validList[i]) return true;
    }
    return false;
}
export default {
    name: '',
    props: {
        size: {
            type: 'String',
            // validator对传入的size的值进行了自定义验证，如果不满足条件，会报出警告
            validator(value) {
                return oneOf(value, ['small','large', 'default'])
            },
            default: 'default'
        },
        disabled: {
            type: 'Boolean',
            default: false
        }
    }
}
```
### slot
插槽、具名插槽(当有多个插槽的时候需要使用具名插槽)
```javascript
<template>
    <button>
        <slot name="icon"></slot>
        <slot></slot>
    </button>
</template>


// 使用组件
<i-button>
    <i-icon slot="icon" type="checkmark"></i-icon>
    按钮1
</i-button>
```

---
## 2. 组件通信
vue的内置通信手段有两种:
* ref: 给元素或组件注册引用信息: this.$refs.xxx获取
* $parent/$children: 访问父子实例

如何跨级或兄弟间通信？ \
&nbsp;&nbsp; Vuex或bus,但是这两种方案依赖第三方插件，不适合用于组件开发，后面会介绍不依赖于插件的黑科技

> 组件开发最难的环节在于解耦组件的交互逻辑，尽量把复杂的逻辑分发到不同的子组件中，然后彼此通信，建立联系。在这其中,computed和Mixin是两个重要的技术点。把状态(数据)交给Vue处理，开发者专注在交互上。
---
## 扩展阅读： Bus和Vuex
1. Bus
Bus其实就是一个空的Vue实例  
```javascript
// 官方示例
const bus = new Vue();

// NewTodoInput
methods: {
    addTodo() {
        bus.$emit('add-to-do',{text: this.newTodoText})
    }
},

// DelTodoInput
methods: {
    delTodo(id) {
        bus.$emit('delete-to-do', id)
    }
},

// TodoList
created() {
    bus.$on('add-to-do',this.addToDo);
    bus.$on('delete-to-do',this.delToDo);
},
beforeDestroy() {
    bus.$off('add-to-do',this.addToDo);
    bus.$off('delete-to-do',this.delToDo);
},
methods() {
    addToDo(newTodo) {
        this.todos.push(newTodo);
    },
    delToDo(id) {
        this.todos = this.todos.filters((todo) => {
            return todo.id !== id;
        })
    }
}
```
一般将bus注册到全局的方法
```javascript
// app.js
var eventBus = {
    install(Vue,options) {
        Vue.prototype.$bus = vue
    }
};

Vue.use(eventBus);
```
2. Vuex  
最简单的Vuex示例
```javascript
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const store = new Vuex.store({
    state: {
        count: 0
    },
    mutations: {
        increment(state) {
            state.count++;
        }
    }
})

// 外界改变state中的count,通过commit调用mutations中的方法
store.commit('increment');
console.log(store.state.count);l
```

["vuex入门"掘金地址: ](https://juejin.im/entry/58cb4c36b123db00532076a2)

## 3. 无依赖组件通信方法: provide/inject  Vue2.2.0以上版本
> provide/inject需要一起使用，以允许一个祖先组件向其所有的后代注入一个依赖，不管组件层次有多深，并在其上下游关系成立的时间里始终生效。与React的上下文相似。
### 3.1&nbsp; provide/inject的简单用法
```javascript

// A.vue
export default {
    name: 'A',
    provide: {
        name: 'sjq'
    }
}

// B.vue
export default {
    name: 'B',
    inject: ['name'],
    mounted() {
        console.log(this.name);
    },
}
```
注意: provide和inject的绑定并不是可响应的。上述如果A.vue中的name值变了，B.vue中name的值不会变  
  
### 3.2&nbsp;如何使用provide/inject代替vuex的作用？  
思路: 把app.vue作为根组件，将整个app.vue实例通过provide向下游提供
```javascript
<template>
    <div>
        <router-view></router-view>
    <div>
</template>
<script>
    export default {
        provide: {
            app: this
        }
    }
</script>
```
**接下来，任何一个组件都通过inject注入app,都可以通过this.app.xxx来访问app中的data、computed、methods等内容** 
   
app.vue是整个项目第一个被渲染的组件，而且只会渲染一次，即便切换路由，app.vue页不会被再次渲染。利用这个特性，很适合做一次性全局的状态数据管理，例如将我们的用户信息保存起来。
  
Example1: 进入应用时，获取用户信息，将用户信息保存到全局，在其他地方都等直接使用用户信息
```javascript
// app.vue
export default {
    provide: {
        app: this
    },
    data() {
        return {
            userInfo: null
        }
    },
    methods: {
        getUserInfo() {
            $.ajax('/user', (data) => {
                this.userInfo = data.userInfo
            })
        }
    },
    mounted() {
        this.getUserInfo();
    },
}


// 其他页面/组件
<template>
  <div>
    {{ app.userInfo }}
  </div>
</template>
<script>
  export default {
    name: 'other'
    inject: ['app'],
    methods: {
        changeUserInfo() {
            $.ajax('/changeuser', () => {
                // 可以直接调用app中的方法
                this.app.getUserInfo();
            })
        }
    }
  }
</script>
```

### 进阶用法
如果在app.vue里面写了非常多的代码，导致结构复杂到难以维护，可以使用Vue的mixins，将不同的逻辑分开到不同的js里
```javascript
// user.js
export default {
    data() {
        return {
            userInfo: null
        }
    },
    methods: {
        getUserInfo() {
            $.ajax('/user', (data) => {
                this.userInfo = data.userInfo
            })
        }
    },
    mounted() {
        this.getUserInfo();
    },
}

// 然后在app.vue中混合
<script>
    import mixins_user from '../mixins/user.js'

    export default {
        mixins: [mixins_user],
        provide: {
            app: this
        },
        data() {
            return {
                
            }
        },
    }
</script>
```
  
> provide/inject Api主要还是在独立组件中发挥作用。只要一个组件使用了provide向下提供数据，那么其下所有的子组件都可以通过inject来注入，不管隔了多少代，而且可以注入来自多个不同父级提供的数据。主要用于具有联动关系的组件。如Form
  
##  4.&nbsp;父子组件通信方法 自行实现dispatch和broadcast
provide/inject 主要解决跨级组件间的通信问题,主要是子组件获取父组件中的状态，有两种场景不能很好地解决。即父子间的通信问题。  
核心知识: 在mixins中实现dispatch和broadcast
```javascript
// 父组件向子组件发出通信
function broadcast(componentName, eventName, params) {
    const children = this.$children;
    children.forEach(child => {
        const compName = child.$options.name;
        // 递归查找组件名
        if (compName === componentName) {
            child.$emit.apply(child, [eventName].concat(params));
        } else {
            broadcast.apply(child, [componentName, eventName].concat(params));
        }
    })
}

// 子组件向父组件发出通信
function dispatch(componentName, eventName, params) {
    // 父组件只有一个
    let parent = this.$parent || this.$root;
    let compName = parent.$options.name;

    while (parent && (!compName || compName !== componentName)) {
        parent = parent.$parent;

        if (parent) {
            compName = parent.$options.name;
        }
    }

    if (parent) {
        parent.$emit.apply(parent, [eventName].concat(params));
    }
}

export default {
    methods: {
        dispatch(componentName, eventName, params) {
            dispatch.call(this, componentName, eventName, params);
        },
        broadcast(componentName, eventName, params) {
            broadcast.call(this, componentName, eventName, params);
        }
    },
}
```
> 总结: 当父组件要向需要的子组件发出通信时,调用broadcast,传入子组件名称，便可对子组件进行递归操作，直到查找到该子组件，调用$emit方法，然后子组件使用$on自行接收该事件；同理，当子组件要向上层组件发出通信时，调用dispatch,传入上层组件的名称，便可从父组件开始依次向上进行查找，直到查找到需要的上层组件，调用$emit方法，然后该上层组件使用$on自行接收该事件。其核心原理在于根据组件树找到要通信的组件自己发送事件，自己接收事件。而broadcast和dispatch则主要实现了如何查找。
  
## 5. 具有数据校验功能的表单组件 Form
主要涉及form 和  form-item 两个组件，这两个组件主要进行数据收集和数据校验，不处理事件。  
  
**接口设计**：  
* slot  
1.form : slot为一系列的form-item  
2.form-item: slot为各种表单控件  
  
* prop  
1.form:  model和rules，model为整个表单对象，rules为校验规则  
2.form-item: label 和 prop。这里面的prop对应表单域Form组件model里的字段，用于在校验或重置时访问表单组件绑定的数据。

### 5.1 在Form中缓存FormItem实例
为什么要在Form中缓存FormItem实例？  
&nbsp;&nbsp;&nbsp;&nbsp; 因为一个Form中包含很多的FormItem,当点击保存的时候，**<font color="deep">Form要拿到每一个FormItem的验证方法进行逐一验证</font>**，再将校验结果汇总后，通过Form返回出去。  
  
因为要在Form中逐一调用FormItem的验证方法,而Form和FormItem是独立的，所以需要预先将FormItem的实例(this)缓存在Form中，这里用dispatch实现,将自己dispatch出去，缓存在Form的数组中，当FormItem销毁的时候，从Form的缓存数组中移除。  
Vue的渲染顺序是由内向外的，所以FormItem是先于Form渲染的。在FormItem的mounted触发时，向Form派发事件将当前FormItem实例(this)传出去。而此时，Form的mounted是未触发的，所以Form中的监听事件不能写在mounted中，而要写在created中，因为Form的created是要先于FormItem的mounted  
  
### 5.2 触发校验  
常见校验:  
1. blur
2. change: 输入框实时输入、下拉框选择器选择项目触发  
