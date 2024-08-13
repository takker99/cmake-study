project(wasm)

if(DEFINED EMSCRIPTEN)
  add_executable(wasm calc.cpp calc.hpp)
  set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

  set_target_properties(wasm PROPERTIES COMPILE_FLAGS "${CPP_FLAGS}")
  set_target_properties(wasm PROPERTIES LINK_FLAGS "${LINK_FLAGS} \"-sINCOMING_MODULE_JS_API=[]\" -sEXPORTED_FUNCTIONS=_add,_sub")
endif()
