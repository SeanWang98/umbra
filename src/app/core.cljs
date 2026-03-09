(ns app.core
  (:require [uix.core :as uix :refer [defui $]]
            [uix.dom]
            ["@/components/ui/button" :refer [Button]]
            ["@/components/ui/card" :refer [Card CardHeader CardTitle CardDescription CardContent CardFooter]]
            ["sonner" :refer [toast]]
            ["@/components/ui/sonner" :refer [Toaster]]
            ["next-themes" :refer [ThemeProvider]]))

(defui app []
  ($ :div {:class "flex items-center justify-center min-h-screen"}
     ($ Card {:class "w-128"}
        ($ CardHeader
           ($ CardTitle "Hello, shadcn/ui!")
           ($ CardDescription "ClojureScript + UIx + shadcn"))
        ($ CardContent
           ($ :p "This card is rendered from a shadcn/ui component via JS interop..."))
        ($ CardFooter {:class "flex gap-2"}
           ($ Button {:variant "default"
                      :on-click #(toast "Default button clicked"
                                        #js {:position "top-center"
                                             :description (.toLocaleString (js/Date.) "en-US" #js {:weekday "long" :year "numeric" :month "long" :day "2-digit" :hour "numeric" :minute "2-digit"})
                                             :action #js {:label "Print"
                                                          :onClick (fn [] (js/console.log "Default button clicked"))}})}
              "Default")
           ($ Button {:variant "outline" :on-click #(toast.info "Outline button clicked")} "Outline")
           ($ Button {:variant "destructive" :on-click #(toast.error "Destructive button clicked")} "Destructive")))))

(defonce root
  (uix.dom/create-root (js/document.getElementById "root")))

(defn ^:dev/after-load render []
  (uix.dom/render-root
   ($ uix/strict-mode
      ($ ThemeProvider {:attribute "class"
                          :defaultTheme "system"
                          :disableTransitionOnChange true}
                 ($ app) ($ Toaster)))
   root))

(defn ^:export init []
  (render))

(defonce _deps-listener
  (.addEventListener js/window "shadow-cljs:deps-ready"
    (fn [_] (render))))
