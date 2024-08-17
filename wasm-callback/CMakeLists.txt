project(wasm-callback)

if(DEFINED EMSCRIPTEN)
  add_executable(wasm-callback print.cpp print.hpp)
  set(CMAKE_EXECUTABLE_SUFFIX ".mjs")
  target_compile_features(wasm-callback PUBLIC cxx_std_23)

  set_target_properties(wasm-callback PROPERTIES COMPILE_FLAGS "${CPP_FLAGS}")
  set_target_properties(
    wasm-callback
    PROPERTIES
      LINK_FLAGS
      "${LINK_FLAGS} -sMODULARIZE=1 -sEXPORT_ES6=1 -sUSE_ES6_IMPORT_META=1 -sFETCH=1 -sEXPORTED_FUNCTIONS=_printFetch -sEXPORTED_RUNTIME_METHODS=ccall"
  )
endif()
