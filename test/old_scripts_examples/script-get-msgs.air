(seq
 (call relay ("op" "identity") [])
 (seq
  (call relay (history "get_all")
        [] result)
  (call %init_peer_id% (returnService "run") [result])
     ))
