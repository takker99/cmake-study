#include <emscripten/wget.h>
#include "print.hpp"
#include <iostream>

extern "C"
{
  extern int read_data(const char *path, void *buffer, int *size, int *error_code);

  const char *printFetch(const char *path)
  {
    void *buffer;
    int size;
    int error_code;
    read_data(path, &buffer, &size, &error_code);
    if (error_code != 0)
    {
      std::cout << "Failed to read " << path << " (status code: " << error_code << ")." << std::endl;
      return "";
    }
    std::cout << "Finished reading " << size << " bytes from " << path << ":\n";
    return static_cast<const char *>(buffer);
  }
}