cmake_minimum_required(VERSION 3.30)

project(practice)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_INSTALL_PREFIX "..")

set(EM_CPP_FLAGS "")
if(EMSCRIPTEN)
  set(VCPKG_INCLUDE_DIR ${VCPKG_INSTALLED_DIR}/${VCPKG_TARGET_TRIPLET}/include)

  set(EM_LINK_FLAGS
      -sASSERTIONS=0
      -sINVOKE_RUN=0
      -sALLOW_MEMORY_GROWTH=1
      -sENVIRONMENT=web
      -sFILESYSTEM=0
      --no-entry
      -sPOLYFILL=0
      -sWASM_BIGINT=1
      -sAUTO_JS_LIBRARIES=0

      -sAUTO_NATIVE_LIBRARIES=0
      -sALLOW_UNIMPLEMENTED_SYSCALLS=1)

  if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(EM_LINK_FLAGS
        ${EM_LINK_FLAGS}
        -gsource-map
        "--source-map-base ./" # Debugging c++ only works in browser with
                               # "Experimental DWARF support turned on"
    )
  else()
    set(EM_LINK_FLAGS ${EM_LINK_FLAGS} -Os)
    set(EM_CPP_FLAGS ${EM_CPP_FLAGS} -Os)
  endif()

  # See: https://github.com/emscripten-core/emscripten/blob/main/src/settings.js
  string(REPLACE ";" " " CPP_FLAGS "${EM_CPP_FLAGS}")

  string(REPLACE ";" " " LINK_FLAGS "${EM_LINK_FLAGS}")

  include_directories(${VCPKG_INCLUDE_DIR} ${CMAKE_CURRENT_BINARY_DIR})

  add_subdirectory(wasm)
else()
  add_subdirectory(simple)
endif()
