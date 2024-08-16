#include <emscripten/wget.h>
#include "print.hpp"
#include <iostream>

extern "C"
{
  const char *printFetch(const char *path)
  {
    void *buffer;
    int size;
    int error_code;
    emscripten_wget_data(path, &buffer, &size, &error_code);
    if (error_code != 0)
    {
      std::cout << "Downloading " << path << " failed (status code: " << error_code << ")." << std::endl;
      return "";
    }
    std::cout << "Finished downloading " << size << " bytes from URL " << path << ":\n";
    return static_cast<const char *>(buffer);
  }
}