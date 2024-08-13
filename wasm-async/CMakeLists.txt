project(wasm-async)

if(DEFINED EMSCRIPTEN)
  add_executable(wasm-async print.cpp print.hpp)
  set(CMAKE_EXECUTABLE_SUFFIX ".mjs")
  target_compile_features(wasm-async PUBLIC cxx_std_23)

  set_target_properties(wasm-async PROPERTIES COMPILE_FLAGS "${CPP_FLAGS}")
  set_target_properties(
    wasm-async
    PROPERTIES
      LINK_FLAGS
      "${LINK_FLAGS} -sMODULARIZE=1 -sEXPORT_ES6=1 -sUSE_ES6_IMPORT_META=1 -sASYNCIFY=1 -sASYNCIFY_IMPORTS=read_data -sEXPORTED_FUNCTIONS=_printFetch -sEXPORTED_RUNTIME_METHODS=ccall --library-js=library.js --pre-js=pre.js"
  )
endif()
