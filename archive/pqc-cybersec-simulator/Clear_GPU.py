#!/usr/bin/env python3
"""
GPU VRAM Cleanup Script for PQC CyberSec Simulator
===================================================
Releases GPU memory used by PyTorch, CuPy, and other CUDA libraries.
Run this script to free up GPU VRAM after closing the demo.
"""

import gc
import sys

def clear_gpu_memory():
    """Clear GPU memory from all known CUDA libraries."""
    cleared = []
    
    # 1. Clear PyTorch CUDA cache
    try:
        import torch
        if torch.cuda.is_available():
            # Move any cached tensors to CPU
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
            cleared.append("PyTorch")
    except ImportError:
        pass
    except Exception as e:
        print(f"PyTorch cleanup warning: {e}")
    
    # 2. Clear CuPy memory pool (used by quantum_service.py)
    try:
        import cupy as cp
        
        # Get memory pools
        mempool = cp.get_default_memory_pool()
        pinned_mempool = cp.get_default_pinned_memory_pool()
        
        # Free all blocks
        mempool.free_all_blocks()
        pinned_mempool.free_all_blocks()
        
        # Synchronize to ensure all operations complete
        cp.cuda.Stream.null.synchronize()
        
        cleared.append("CuPy")
    except ImportError:
        pass
    except Exception as e:
        print(f"CuPy cleanup warning: {e}")
    
    # 3. Clear TensorFlow GPU memory (if used)
    try:
        import tensorflow as tf
        # Clear TensorFlow session
        tf.keras.backend.clear_session()
        cleared.append("TensorFlow")
    except ImportError:
        pass
    except Exception as e:
        print(f"TensorFlow cleanup warning: {e}")
    
    # 4. Clear numba CUDA cache
    try:
        from numba import cuda
        cuda.close()
        cleared.append("Numba")
    except ImportError:
        pass
    except Exception as e:
        print(f"Numba cleanup warning: {e}")
    
    # 5. Force Python garbage collection
    gc.collect()
    
    # 6. Try to reset CUDA device (last resort)
    try:
        import cupy as cp
        device = cp.cuda.Device()
        # Note: This can be aggressive, only if really needed
        # device.synchronize()
    except:
        pass
    
    return cleared


def get_gpu_memory_info():
    """Get current GPU memory usage."""
    try:
        import cupy as cp
        mempool = cp.get_default_memory_pool()
        used = mempool.used_bytes() / (1024 * 1024)
        total = mempool.total_bytes() / (1024 * 1024)
        return f"CuPy: {used:.1f} MB used, {total:.1f} MB total in pool"
    except:
        pass
    
    try:
        import torch
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated() / (1024 * 1024)
            reserved = torch.cuda.memory_reserved() / (1024 * 1024)
            return f"PyTorch: {allocated:.1f} MB allocated, {reserved:.1f} MB reserved"
    except:
        pass
    
    return "GPU memory info not available"


if __name__ == "__main__":
    print("=" * 60)
    print("  GPU VRAM Cleanup - PQC CyberSec Simulator")
    print("=" * 60)
    
    # Show before state
    print(f"\nBefore cleanup: {get_gpu_memory_info()}")
    
    # Clear memory
    print("\nClearing GPU memory...")
    cleared = clear_gpu_memory()
    
    if cleared:
        print(f"  Cleared: {', '.join(cleared)}")
    else:
        print("  No GPU libraries found to clear")
    
    # Show after state
    print(f"\nAfter cleanup: {get_gpu_memory_info()}")
    
    print("\n" + "=" * 60)
    print("  GPU cleanup complete!")
    print("=" * 60)
    
    sys.exit(0)
