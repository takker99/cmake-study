#include "print.hpp"
// #include <iostream>
#include <cstdio>

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
      // std::cout << "Failed to read " << path << " (status code: " << error_code << ")." << std::endl;
      // the above line can be rewritten using `printf` as follows:
      printf("Failed to read %s (status code: %d).\n", path, error_code);

      return "";
    }
    // std::cout << "Finished reading " << size << " bytes from " << path << ":\n";
    // the above line can be rewritten using `printf` as follows:
    printf("Finished reading %d bytes from %s:\n", size, path);
    return static_cast<const char *>(buffer);
  }
}