import { invariant } from "./utils"

type Module = any

type ModuleMark = string

interface ModuleCallback {
    waitFor: string[]
    moduleMarks: ModuleMark[]
    callback: Function
}

export class Mediator {
    private readonly modules: Record<string, Module> = {}
    private readonly connected: Record<string, boolean> = {}
    readonly moduleCallbackList: ModuleCallback[] = []
    readonly ForEachCallbackList: Function[] = []

    register(name: string, module: Module) {
        invariant(typeof name !== 'string', 'Name must be a string!')

        invariant(!module, 'register takes two arguments')

        var isInstance = name[0] === name[0].toLowerCase()

        if (isInstance) {
            if (!this.modules[name]) {
                this.modules[name] = []
            }
            this.modules[name].push(module)
        } else {
            invariant(this.modules[name], `Module ${name} already exists!`)

            this.modules[name] = module

            for (var callbackIndex = this.moduleCallbackList.length - 1; callbackIndex >= 0; callbackIndex--) {
                const { waitFor, moduleMarks, callback } = this.moduleCallbackList[callbackIndex]

                const moduleIndex = waitFor.indexOf(name)
                if (moduleIndex === -1) {
                    continue
                }

                waitFor.splice(moduleIndex, 1)
                if (waitFor.length !== 0) {
                    continue
                }

                const moduleInstances = this.getModules(moduleMarks)
                callback(moduleInstances)
                this.moduleCallbackList.splice(callbackIndex, 1)
            }
        }

        this.ForEachCallbackList.forEach((callback: Function) => callback(module, name))

        return module
    }

    connect(moduleMarks: string[], callback: Function) {
        const claimed = moduleMarks.filter((name: string) => {
            var available = !!this.connected[name]
            if (available) this.connected[name] = true
            return available
        })

        invariant(claimed.length > 0, `Cannot group modules ${claimed.join(',')}: They are already coupled!`)

        var waitFor = moduleMarks.filter((name) => !this.modules[name])

        if (waitFor.length === 0) {
            callback(this.getModules(moduleMarks))
        } else {
            this.moduleCallbackList.push({ waitFor, moduleMarks, callback })
        }
        return this
    }

    forEach({ needIoadModules, fn }: { moduleMark: ModuleMark, needIoadModules: ModuleMark[], fn: Function }) {
        invariant(typeof fn !== 'function', 'Callback is not a function!')

        this.connect(needIoadModules, (loadModule: Record<string, any>) => {
            const callback = (module: Module, name: string) => fn([module, name].concat(loadModule))

            this.ForEachCallbackList.push(callback)

            Object.keys(this.modules).forEach((name: string) => {
                var modules: Module[] = this.modules[name]
                if (!Array.isArray(modules)) {
                    modules = [modules]
                }
                modules.forEach((module) => callback(module, name))
            })
        })
        return this
    }

    group(name: string, moduleNames: string[], callback: Function) {
        invariant(name[0] !== name[0].toUpperCase(), 'Group is a Module, so the name should start with UpperCase.')

        this.connect(moduleNames, (args: any[]) => {
            var module = {}
            module = callback(module, args) || module
            this.register(name, module)
        })
        return this
    }


    getModules(moduleMarks: ModuleMark[]) {
        return moduleMarks.map((name: ModuleMark) => this.modules[name])
    }
}