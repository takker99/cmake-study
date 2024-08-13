#include <string_view>
#include <emscripten/fetch.h>
#include "print.hpp"
#include <iostream>

extern "C"
{
  void printFetch(const char *path)
  {
    using namespace std::string_view_literals;
    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    "GET"sv.copy(attr.requestMethod, 3);
    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
    attr.onsuccess = [](emscripten_fetch_t *fetch)
    {
      std::cout << "Finished downloading " << fetch->numBytes << " bytes from URL " << fetch->url << ":\n";
      std::cout << fetch->data << std::endl;

      emscripten_fetch_close(fetch); // Free data associated with the fetch.
    };
    attr.onerror = [](emscripten_fetch_t *fetch)
    {
      std::cout << "Downloading " << fetch->url << " failed, HTTP failure status code: " << fetch->status << ".\n";
      emscripten_fetch_close(fetch); // Also free data on failure.
    };
    emscripten_fetch(&attr, path);
  }
}